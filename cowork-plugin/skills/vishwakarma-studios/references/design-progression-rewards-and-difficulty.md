# Design: progression, rewards, grind, and difficulty

Progression, rewards, grind and difficulty are downstream of the core loop (see design-core-loop-and-scope.md): they shape how long a player keeps choosing to repeat it and how the repetition stays interesting. Each has arithmetic that can be checked on paper before it is built. Numbers below are stated for a specific genre and scale where they differ; where a number is given without a qualifier it is a starting value to tune from, not a law.

## 1. Progression: five types and their pacing

Progression is the answer to "why is my thirtieth hour different from my third". Five types exist, they have different pacing requirements, and mixing them badly is the source of most progression complaints.

| Type | What changes | Earned or given | Pacing | Failure mode |
|---|---|---|---|---|
| Power | Numbers: damage, health, speed, capacity | Earned; sometimes given at act breaks | Steady, 3–8% per hour of effective power | Inflation: enemies scale with you and nothing feels different |
| Capability | New verbs: double jump, hack, parry, craft | Given at designed beats | 1 new verb per 45–90 min early, tapering | Verb overload; the player forgets what they have |
| Cosmetic | Appearance only | Earned or purchased | Unconstrained | None, if it is genuinely mechanically inert |
| Narrative | Story, world knowledge, character relationships | Given on the critical path | 1 significant beat per 20–40 min | Pacing collapse when gated behind grinding |
| Mastery | The player's own skill; no game state changes | Earned by the player, not granted | Continuous | Difficulty that outpaces or lags actual skill growth |

The critical distinction is earned versus given. **Earned** progression is contingent on player action and its value comes from that contingency: a weapon earned by defeating a hard boss carries the memory of the fight. **Given** progression is a designed beat delivered on the critical path regardless of performance, and its value is pacing control — it lets you guarantee the player has the double jump before the level that requires it. Confusing the two produces the two classic errors: making a required capability contingent on optional content, which strands players; and giving away rewards the design has taught the player to earn, which devalues the whole category.

Capability progression is worth more per unit than power progression and costs more to produce. A new verb changes every subsequent encounter and reframes old content; a 12% damage increase changes a number. Where budget forces a choice, cut power tiers and keep verbs. The corollary is that power progression must be *felt* rather than merely computed: a damage increase that changes a three-hit kill into a two-hit kill is perceptible, and a 6% increase that changes nothing about the number of hits is invisible regardless of what the sheet says. Tune power progression against breakpoints in the encounter design, not against a smooth curve.

Mastery progression is the type most often left to chance and it is the one that produces long-term communities. It requires that the game have a skill ceiling the player can perceive themselves approaching, that failure be legible enough to learn from, and that the game not silently compensate for improvement (which is the argument against aggressive difficulty adjustment in section 5).

Solo: pick two progression types and do them well; a solo game with capability progression and mastery needs no upgrade tree at all. Studio: every progression type has a named owner and a tuning document, curves are simulated against synthetic player careers before they reach a build, and cross-type interactions — a power curve that invalidates a capability, a narrative gate behind an economy sink — are reviewed as a standing agenda item.

Level-scaling deserves a specific warning. Scaling enemy power with player level keeps encounters "balanced" and destroys power progression entirely, because the player's relationship to the world is unchanged after twenty hours of investment. If scaling is used at all, scale a subset — trash enemies scale, named enemies and regions do not — so returning to an early area still demonstrates growth. The feeling of walking back into the starting zone and trivially defeating what once nearly killed you is one of the most reliable rewards in the medium, and level scaling deletes it.

## 2. Rewards: schedule, salience, and diminishing return

A reward is only a reward if the player notices it. This sounds trivial and it is the most common failure in progression design, because reward volume is easy to increase and reward salience is not, and a system that emits eleven rewards per minute has trained the player to ignore all of them.

Three schedules, with different behavioural signatures. **Fixed** rewards — every third kill, every level completion — are predictable, which makes them good for pacing guarantees and poor at sustaining attention, because the player disengages between beats. **Variable ratio** rewards — a chance per action — produce the strongest and most persistent engagement, which is exactly why they carry the ethical weight discussed in design-economy-and-monetisation.md and why they should be used deliberately rather than sprinkled. **Milestone** rewards, delivered at designed thresholds, are the pacing tool: they let you guarantee that a player has a specific capability at a specific point regardless of luck, and every design using random rewards for anything required needs a milestone backstop.

Salience is engineered, not assumed. A reward registers when it is anticipated (the player knew it was possible), when it is legible (they can tell what changed), and when it changes behaviour (the next repetition is played differently). Measure the third: if the player's next five minutes are identical after receiving the reward, it was decoration. The practical controls are ratio and contrast — roughly one significant reward per 8–20 minutes in a mainstream single-player game, with minor rewards between, and a clear presentational difference between the tiers so the player's attention can allocate itself correctly.

Diminishing return is arithmetic. The perceived value of an additional unit falls roughly logarithmically: the first weapon upgrade transforms the game, the eighth is a number in a menu. Two mitigations work. Change the *kind* of reward as the game progresses — power early, capability mid, cosmetic and mastery late — because a new category resets the scale. And introduce scarcity: a reward available at any time from any activity has no value, and the same item gated behind a specific challenge has a great deal.

The reward that most consistently underperforms is currency granted for actions the player would take anyway. It costs design budget, adds a number to the screen, and changes nothing; its only defensible use is as an economy faucet whose rate has been computed in design-economy-and-monetisation.md, and if it is doing that job it should not also be presented as an exciting reward.

## 3. Grind: where repetition becomes labour

Repetition is the medium; grind is repetition the player has stopped choosing. The line between them is precise and testable: repetition is grind when the player can predict the outcome, cannot influence it through skill or decision, and continues only because the reward is gated behind volume. Each of those three clauses suggests its own fix.

**Unpredictability** is restored with variance in the activity itself — different opponents, layouts, modifiers, objectives — rather than with variance in the reward, which is a different mechanism with different consequences. **Influence** is restored by making efficiency skill-dependent: if a competent player completes the activity in 60% of the time an incompetent one takes, the activity rewards engagement rather than attendance. **Gating by volume** is the one that requires an honest look at the economy, because a requirement of 40 repetitions usually exists to extend playtime rather than to serve the design, and the correct fix is to reduce it.

The diagnostic signals in telemetry are consistent: session length falls while session frequency holds (players are doing their dailies and leaving), completion time per repetition falls to a hard floor as players optimise the fun out of it, and forum sentiment shifts from discussing the activity to discussing how to minimise it. Watch for players inventing efficiency strategies that skip the content — that is the clearest possible statement that the content is not worth its time cost.

Optional grind is legitimate and required grind usually is not. A completionist chasing a cosmetic through 200 repetitions has chosen that, and the design has done nothing wrong by offering it. The same 200 repetitions in front of a story chapter converts a player who wanted a narrative into a player performing labour for a gate, and their conclusion — that the game is padding itself because it has run out of content — is generally correct.

## 4. Difficulty: the sawtooth, not the ramp

A monotonic difficulty ramp is wrong, and the reason is perceptual rather than aesthetic. Difficulty is experienced relative to the preceding few minutes, not on an absolute scale, so a smoothly rising line reads as flat — the player never notices the increase because they never have a low point to compare it to. Tension needs release to be tension.

The correct shape is a sawtooth: build intensity over 8–15 minutes, peak, then drop sharply to a low-pressure passage of 1–3 minutes, then build again from a slightly higher floor. Across a campaign the peaks and the floors both trend upward, but the local shape is repeated rise-and-drop. The low passages are not filler; they are what make the peaks legible, and they serve three concrete functions: they let the player consolidate what they just learned, they allow narrative and environmental delivery when attention is available, and they reset the physiological arousal that makes sustained high intensity exhausting rather than exciting.

Flow-channel theory gives the underlying constraint. Challenge that outpaces skill produces anxiety and quitting; skill that outpaces challenge produces boredom and quitting; the playable corridor sits between them and widens as the player grows. Two consequences follow. Skill growth is not linear — it is fast in the first hour, plateaus, jumps after an insight — so a linear challenge curve leaves the corridor at every plateau. And the corridor is per-player, which is what difficulty options and, more contentiously, dynamic adjustment exist to address.

Practical numbers to tune against. Boss encounters should be attempted 2–5 times before success for a mainstream action title, 5–15 for a game whose identity is difficulty; median attempts above 8 on a mainstream title is where the telemetry shows abandonment climbing steeply. Failure recovery time — death to back in the action — should sit under 10 seconds, because the cost of failure is loading time far more than it is lost progress, and a 45-second recovery converts a fair challenge into a hated one. Roughly 10–20% of players will finish a mainstream single-player campaign, which is a fact about the medium rather than about your game, but the drop-off shape is diagnostic: a cliff at a specific encounter is a difficulty defect, a smooth decay is normal attrition.

Solo: build the sawtooth into the level order and measure attempts per encounter from your own playtests; you will not have the telemetry volume for anything finer. Studio: intensity is charted per level as a designed curve before layout begins, encounter difficulty is validated against instrumented playtest cohorts at three skill bands, and any encounter whose median attempt count exceeds its target is re-tuned before it leaves the milestone.

The parameters available for tuning are not equally perceptible, and tuning the invisible ones is how a team spends a month changing nothing:

| Parameter | Perceptibility | Typical usable range | Note |
|---|---|---|---|
| Enemy count per encounter | Very high | 0.5x–2x baseline | Changes tactics, not just numbers |
| Enemy damage to player | High | 0.6x–1.6x | The parameter players notice first |
| Player damage output | High, via hit-count breakpoints | 0.8x–1.4x | Only perceptible when it crosses a breakpoint |
| Enemy health | Moderate, and negative above 1.3x | 0.7x–1.3x | Above this it reads as spongy, not hard |
| Enemy aggression and reaction time | High | 0.7x–1.5x on delays | Cheap, effective, and rarely used |
| Timing window width (parry, dodge) | Very high | 60–250 ms | The single strongest accessibility lever |
| Aim assist strength | Very high on controller | 0–100% | Should be exposed explicitly |
| Resource and ammunition scarcity | High over a session | 0.5x–1.5x drop rate | Shapes pacing more than any single fight |
| Checkpoint density | Very high on frustration | 1 per 2–8 min | Changes the cost of failure, not the challenge |

Difficulty options are not a substitute for a curve. Their job is to widen the corridor for players whose skill sits outside your assumed band, and they work best when they change specific, named parameters (enemy damage, aim assist strength, timing window width, puzzle hint availability) rather than presenting an opaque easy/normal/hard switch, because named parameters let a player fix the one thing blocking them without lowering everything else. Accessibility-driven options — remappable controls, hold-to-press toggles, extended timing windows, reduced quick-time-event demands — belong in the same system and are not a difficulty concession.

## 5. Dynamic difficulty adjustment

Dynamic difficulty adjustment silently changes challenge parameters in response to player performance. It helps in three specific situations and is patronising or harmful outside them.

It helps when the cost of a player getting stuck is losing them entirely and the game's identity does not rest on difficulty — a narrative-led action game where a boss blocking a player at hour twelve means they never see the ending. It helps when it manages pacing rather than outcome, as in an encounter director that varies enemy spawn timing and composition to maintain a tension rhythm rather than to guarantee a result. And it helps in the direction of *increase*: raising challenge for a player who is dominating is far less objectionable than lowering it for a player who is struggling, because it does not imply a judgement about them.

It is patronising when it removes the meaning of success. A player who beats a boss after eight attempts and later learns the boss was weakened by 30% on attempt six has had the accomplishment retroactively taken from them, and the resulting sense of condescension is the reason these systems are usually hidden. It is unacceptable in any competitive context, where an adjustment that helps one player takes from another; rubber-banding in racing games is the tolerated exception precisely because it is understood as an explicit rule of that genre rather than a hidden accommodation. And it is wrong in games whose fantasy is mastery, where the difficulty is the product.

The design constraints when it is used. Adjust slowly and within a narrow band — 10–20% on damage taken or dealt, never on whether an attack is survivable at all, because the player's model of what kills them must stay stable. Trigger on consistent evidence, such as three or four consecutive failures at the same encounter, rather than on a single death. Adjust between attempts, never mid-encounter, so the rules do not change while the player is inside them. Return to baseline once the player clears the section, or the adjustment compounds into a permanently easier game. And do not adjust the parameters the player is explicitly optimising: reducing enemy health in a game about damage optimisation invalidates the activity the player came for.

On disclosure, the defensible position is that the system's existence should be documented — in an options menu, a settings toggle, or the accessibility documentation — even when individual adjustments are not surfaced. Per-adjustment notification defeats the mechanism, but a player who discovers an undisclosed system after the fact feels deceived, and the reputational cost of that discovery exceeds any benefit from concealment. An explicit toggle that lets a player turn assistance off entirely resolves the tension almost completely and costs little.

## Pass conditions

Answer yes to every applicable line before the design is considered sound.

1. Reward schedules are chosen deliberately per reward type, milestone backstops exist behind anything required that is randomly granted, and reward salience is verified by whether the player's next five minutes change.
2. Required repetition has been checked against the grind test — predictable, uninfluenceable, gated by volume — and reduced where all three hold.
3. Progression types are classified as power, capability, cosmetic, narrative or mastery, and each item is deliberately earned or given rather than accidentally either.
4. No required capability is gated behind optional content.
5. Power progression is tuned against encounter breakpoints so increases are perceptible, not merely numerically true.
6. If level scaling is used, some content is exempt so returning to early areas demonstrates growth.
7. The difficulty curve is a sawtooth with recovery passages of 1–3 minutes, not a monotonic ramp.
8. Median attempts per major encounter is measured against a target appropriate to the genre, and failure-to-retry time is under 10 seconds.
9. Difficulty options change named parameters rather than presenting an opaque single switch, and accessibility options exist independently of them.
10. If dynamic difficulty adjustment is used, it operates within a narrow band, triggers on repeated rather than single failure, adjusts between attempts rather than during them, returns to baseline, is absent from competitive contexts, and its existence is disclosed with a means to disable it.
