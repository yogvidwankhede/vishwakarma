# Shipping and Live Operations: Playtesting, Telemetry and Measurement

Shipping is the midpoint. The build that goes to certification is the first version the game's real audience will see and roughly the last one the team fully controls, and everything after it — patches, seasons, incidents, sunsetting — is constrained by decisions made six to eighteen months earlier. Whether a text fix costs a 40 GB download, whether a broken economy can be corrected without a client patch, whether a crash report resolves to a function name or to a hexadecimal address, whether the servers survive the first Saturday: all of that is architecture, decided long before launch by people who were thinking about something else.

This file covers how the game is tested and measured, before launch and after it. Launch operations and incidents live in `shipping-launch-and-incidents.md`, patching and live operations in `shipping-patching-and-liveops.md`, and stability, trust and sunsetting in `shipping-stability-trust-and-sunset.md`. Build and certification mechanics live in `production-pipeline.md`; runtime performance work lives in the engine and rendering files.

## 1. The playtest ladder

Each rung of the ladder answers a different question, and running one to answer another's question wastes the rung. A test's population, its instrumentation and its stakes should be chosen from the question, not from what is convenient.

| Rung | Population | Answers | Does not answer |
|---|---|---|---|
| Internal / dogfood | The team, daily | Is it broken? Does the new thing work? | Anything about a first-time player; the team is permanently contaminated |
| Friends and family | 10–50, under NDA | Does a fresh player understand the first hour? | Balance at depth, retention, load |
| Closed alpha / technical test | 500–5,000, invited | Do the servers hold under real client diversity? Does early retention exist? | Long-term progression, monetisation at scale |
| Closed beta | 5,000–50,000 | Retention curves, funnel drop-off, matchmaking quality, hardware distribution | Launch-day peak; population is still self-selected |
| Open beta / stress test | 50,000–millions | Peak load, network topology, store and entitlement flow, marketing signal | Anything about players who would not opt into a beta |
| Demo | Public, post-launch-adjacent | Conversion, first-hour quality at scale | The rest of the game |

Two properties of playtesting govern its economics. Fresh players are a consumable resource: a person can only play the first hour for the first time once, and a team that burns its friends-and-family pool on an early broken build has spent it. Recruit deliberately, keep a reserve for the build that matters, and use paid external recruitment when the internal pool is exhausted. And observation and telemetry answer different questions — five observed players will expose most of the usability failures in a session, while a thousand instrumented players will tell you where the population drops out but never why, which is section 7.

Studio: schedule the ladder backwards from launch — technical test at least four months out so its findings can change server architecture, closed beta at two to three months, open beta or stress test at three to six weeks with the launch build's networking code. A stress test with a build that is not architecturally the launch build tests the wrong system.

Beta builds leak. Anything present in a client that thousands of people hold will be datamined and posted, including unreferenced assets, string tables for unannounced content, and configuration for features not yet enabled. Strip unreleased content from beta clients rather than disabling it, keep unannounced strings out of the shipped localisation tables, and assume that any secret in a client build has a shelf life measured in hours after release.

## 2. Running an observed playtest

The method matters more than the sample size at this end of the ladder. Give the player the build with as little framing as the real product would provide, tell them to think aloud, and then stay quiet. The single most common error is the facilitator answering a question the game should have answered, which destroys the finding — the moment a tester says "wait, how do I…" is the finding, and the answer suppresses it.

Instrument the session with a screen and face capture, a timestamped observer note stream, and the game's own telemetry so that behaviour can be reconciled with the recording afterwards. Fix a task list in advance — reach the first save, defeat the first boss, buy an item, invite a friend — so that sessions are comparable, and let the player continue past the tasks so you can see what they choose. Run five to eight players per build for usability, more when comparing variants, and always debrief with a short structured questionnaire rather than an open chat, because open chat produces politeness.

Studio: hold a fixed cadence — a session block every two weeks from vertical slice — and require the responsible designer to attend rather than to read a report. A designer watching a player fail their intent for ten silent minutes changes the design; the same information in a summary document gets contested.

## 3. Telemetry design

Telemetry is a schema decision made once and lived with, because events are only comparable across time if their definitions are stable. Design the event set from the questions the team will ask, version every event, and treat a change to an event's meaning as a breaking change requiring a new name.

The event set that earns its cost in almost every game:

| Event | Key fields | Question it answers |
|---|---|---|
| `session_start` / `session_end` | build, platform, hardware, locale, session id, duration, exit reason | Session length distribution, crash-adjacent exits, hardware mix |
| `level_start` / `level_end` | level id, duration, outcome, difficulty settings | Where time is spent; where players stop |
| `player_death` | position, cause, killer, attempt count, elapsed since checkpoint | Difficulty spikes, unfair deaths, heatmaps |
| `progression` | node id, elapsed play time, attempt count | Funnel and drop-off |
| `tutorial_step` | step id, duration, retries, skipped | Onboarding failure points |
| `setting_changed` | setting, old, new, when in the session | Which defaults are wrong; accessibility feature usage |
| `economy` | source or sink, currency, amount, balance after | Inflation, faucet and sink balance, exploit detection |
| `purchase` | item, price, currency, context, first-purchase flag | Monetisation and, more importantly, monetisation regressions |
| `matchmaking` | wait time, party size, skill spread, region, outcome | Queue health per region and per hour |
| `network_quality` | latency, packet loss, disconnect reason | Whether the disconnects are yours or theirs |
| `error` / `crash` | build, symbolication key, context, breadcrumb trail | See `shipping-stability-trust-and-sunset.md` |

Volume must be designed rather than discovered. A million daily players emitting 100 events each is 100 million events per day; at 200 bytes each that is 20 GB per day of raw ingest before indexing, which is a real cost with a real bill. Sample high-frequency events — positional telemetry at 1 Hz rather than per frame, and at a percentage of sessions rather than all of them — keep the payload small by using identifiers rather than strings, and set a retention policy per event class. Studio: put an engineer with the analytics team who owns the schema and its budget, because an unowned schema grows into a set of events nobody trusts and nobody deletes. Solo: ten well-chosen events with stable definitions beat sixty improvised ones, and the ingest cost of a small game is close to zero, so the constraint is your attention rather than the bill.

Two properties are worth enforcing from the start. Every event carries the build identifier, so that a metric shift can be attributed to a patch rather than to the world. And every session carries a stable pseudonymous install identifier, so that funnels can be computed across sessions without carrying anything that identifies a person.

## 4. Funnels, heatmaps and the metrics that mean something

A funnel is a sequence of steps with a count at each, and its value lies entirely in the size of the step-to-step drops. Instrument the acquisition and onboarding funnel first: launch, first input, tutorial complete, first meaningful choice, first session end, return on day one, day seven, day thirty. A step losing 5% is normal; a step losing 40% is the most valuable finding the project will get that month, and it is invisible without the instrumentation.

Heatmaps convert positional telemetry into a picture a level designer can act on. Three maps repay their cost. Deaths, aggregated by cause, which shows difficulty spikes and unfair geometry. Quits — the location and moment at which a session ends and, better, at which the player never returns — which is the single most informative map in the set and the least commonly built. And path density, which reveals the routes players actually take and, by omission, the content nobody has seen.

The metrics worth putting on a permanent dashboard, each with the interpretation that makes it useful:

| Metric | Typical target or reference | What it tells you |
|---|---|---|
| Crash-free session rate | Above 99.5%, ideally 99.8%+ | The single best proxy for shipped stability; see `shipping-stability-trust-and-sunset.md` |
| Day 1 / Day 7 / Day 30 retention | Genre-dependent; track the shape, not the absolute | Whether the game holds people; D1 is onboarding, D30 is depth |
| Median session length | Compare to the design intent | A large gap means the pacing model is wrong |
| Tutorial completion | 70–90% healthy for a paid title | Below that, the onboarding is broken and everything downstream is noise |
| Progression drop-off per node | Smooth decay expected | Any step-change is a difficulty, clarity or bug problem |
| Matchmaking wait, p50 and p95 | Mode and region-dependent | p95 is the number players complain about; p50 hides it |
| Load time, p95 by platform | Under 30 s to interactive is a common bar | Correlates directly with abandonment on the first session |
| Concurrent players, peak per day | Capacity input | Peak, not average, sizes the servers |

Guard against the two standard errors. Averages hide the distribution — report p50 and p95 and a histogram, because the mean session length of a population containing both 3-minute bounces and 4-hour sessions describes nobody. And a metric that becomes a target stops measuring what it measured, so keep the dashboard small and pair every optimisation metric with a health metric that would degrade if the optimisation were being gamed.

## 5. Experiments and what they can honestly decide

A/B testing works in games and it is misused more often than it is used well, because the sample sizes are smaller than web experimentation assumes and the outcome variables are slower. An experiment needs a hypothesis stated before the data arrives, a single manipulated variable, a randomisation unit that matches the effect being measured, a pre-registered primary metric, and a pre-computed sample size. Without the last of those, a team runs an experiment until it shows what someone wanted, which is not an experiment.

Sample size is the constraint that decides feasibility. Detecting a 1% change in a conversion metric at conventional confidence needs tens of thousands of players per arm; detecting a 10% change in day-one retention needs a few thousand. Retention effects need the retention window to elapse, so a day-seven metric costs at least a week per iteration regardless of population. Studio: compute the detectable effect size for the population you actually have before designing the test, and abandon experiments whose detectable effect is larger than the effect anyone expects.

Guardrail metrics are what stop an experiment from optimising one number into a worse game. Pair every primary metric with a set that must not degrade: session length, retention, crash-free rate, refund rate, support contact rate and sentiment. An onboarding variant that raises tutorial completion by 8% while lowering day-seven retention by 3% has made the game worse, and only the guardrail reveals it.

Three limits worth stating plainly. Randomising players into different prices, different drop rates or different monetisation pressure is an ethical and increasingly a legal exposure, and the reputational cost when it is discovered — and it is discovered, because players compare — exceeds the value of the finding. Experiments that manipulate difficulty or reward schedules affect the player's experience of the game rather than only its interface, and deserve a higher bar. And a live game running many simultaneous experiments accumulates interactions that make each result less trustworthy; keep a holdout group receiving no experiments so the baseline remains measurable.

## 6. Privacy, consent and regional law

Telemetry collects data about people, which makes it a legal object as well as a technical one, and the obligations differ by where the player is rather than by where the studio is.

| Regime | Territory | Practical requirement |
|---|---|---|
| GDPR | EU/EEA, and UK GDPR in Britain | Lawful basis, consent for non-essential processing, data minimisation, access and erasure rights, processor agreements, breach notification within 72 hours |
| CCPA / CPRA | California, with similar laws in other US states | Disclosure, opt-out of sale or sharing, deletion rights |
| COPPA | United States, under-13 | Verifiable parental consent, no behavioural advertising, minimal collection; drives the age gate design |
| PIPL | Mainland China | Consent, localisation of data, cross-border transfer controls |
| LGPD | Brazil | Broadly GDPR-shaped |
| Platform policies | All | Apple's tracking permission, Google Play data safety declarations, console-specific terms; a policy breach removes the product from the store |

The design that satisfies most of this at once, and is far cheaper than retrofitting: collect the minimum that answers a stated question, key everything to a pseudonymous per-install identifier rather than to an account or a device identifier, keep personal data out of event payloads entirely — no names, no chat content, no free text, no precise location — implement deletion as a working pipeline before launch rather than after the first request, separate essential telemetry (crash and error reporting, fraud prevention) from optional analytics so a refusal of consent leaves the game diagnosable, and set retention periods per event class with automatic expiry.

Age gating deserves specific attention because it propagates. A neutral age gate at first boot determines whether behavioural advertising, social features, chat and data collection are permitted for that player, and getting it wrong is a regulatory exposure rather than a product defect. Studio: have counsel review the data map and the consent flow before the closed beta, not before launch, because the beta collects real data from real people under the same laws.

## 7. What telemetry cannot tell you

Telemetry reports what happened, at scale, with precision, and it is silent on why. It will tell you that 38% of players stop at the swamp; it cannot distinguish a difficulty spike from a navigation failure from a tonal misjudgement from a bug that only manifests on one GPU driver, and those four have different fixes. Acting on the number without the cause produces the characteristic failure: the swamp is made easier, the drop-off stays, and the real cause — an ambiguous objective marker — is never found.

Three further blind spots. Telemetry cannot measure the counterfactual: it has nothing to say about players who never installed, and nothing about the experience that would have existed had you built the other thing. It cannot see satisfaction: a player who finished the game and disliked it emits the same completion event as one who loved it, which is what surveys and sentiment analysis are for. And it cannot see anything you did not instrument in advance, which means the question you most want to answer after launch is frequently unanswerable until the next patch adds the event — a good reason to instrument slightly more than the immediate question requires.

The pairing that works: telemetry finds the location, observed play finds the cause, and a targeted survey measures whether the fix changed how people felt. Studio: when a metric prompts a change, require the change proposal to name the observed evidence for the cause, not only the metric that raised the flag.

## Pass conditions

Answer yes to every applicable line before the game is considered ready to ship and to operate.

1. Each rung of the playtest ladder is scheduled backwards from launch, with the technical test early enough that its findings can change server architecture.
2. The stress test runs the launch build's networking code, not a proxy for it.
3. Unreleased content is stripped from beta clients rather than disabled, and no secret is assumed to survive a public build.
4. Observed playtests run at a fixed cadence with the responsible designer present, capture is instrumented, and facilitators do not answer questions the game should answer.
5. The telemetry event schema is owned by a named engineer, every event is versioned, and every event carries the build identifier and a pseudonymous install identifier.
6. Event volume and retention are budgeted, high-frequency events are sampled, and no event payload contains personal data or free text.
7. Onboarding and progression funnels are instrumented end to end, and death, quit and path-density heatmaps exist for every shipped level.
8. Dashboards report p50 and p95 rather than means, and the metric set is small enough that the team reads it.
9. Experiments state a hypothesis and a primary metric before the data arrives, compute a detectable effect size against the real population, and carry guardrail metrics.
10. A holdout group receiving no experiments exists so the baseline stays measurable, and price and monetisation pressure are not randomised across players.
11. A data map and consent flow have been reviewed by counsel before the closed beta, and deletion is an implemented pipeline rather than a documented intention.
12. Essential diagnostics are separated from optional analytics so a consent refusal leaves the game diagnosable.
13. Every change proposal driven by a metric names the observed evidence for the cause, not only the metric.
