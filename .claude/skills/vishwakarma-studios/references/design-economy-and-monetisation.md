# Design: economy, currencies, and monetisation

A game economy is a flow model wrapped around the core loop, and its arithmetic can be checked on paper before it is built. This part covers sources and sinks, currency structure, the free-to-play retention model, session pacing mechanics, and where monetisation crosses into predation. Numbers are stated for a specific genre and scale where they differ; where a number is given without a qualifier it is a starting value to tune from, not a law.

## 1. Economy: sources, sinks, and the arithmetic

Every game economy is a flow model with sources (faucets) that create currency and sinks (drains) that destroy it. Balance is not about the numbers on any single item; it is about whether the flows are matched over the intended lifetime, and it can be computed on paper before a line of code exists.

Model it as: net accumulation per hour = (sum of source rates) − (sum of sink rates), evaluated separately for each currency and each stage of play. Then check the two conditions that matter. **Saturation**: at the intended play rate, how many hours until the player can afford everything worth buying? If the answer is less than your intended engagement duration, currency becomes meaningless and every subsequent reward lands flat. **Starvation**: at the tenth percentile of player efficiency, can they afford the things the design assumes they have? If not, your difficulty curve is wrong for the bottom decile in a way that looks like a difficulty problem and is actually an economy problem.

A worked example. A player earns 1,150 soft currency per hour at the intended play rate. The sink catalogue totals 62,000 across all purchasable upgrades and consumables. Saturation is 54 hours, so a 25-hour campaign leaves the player with roughly half the catalogue unbought — healthy, because choice remains meaningful — while a 90-hour game with the same numbers has 36 hours in which currency rewards mean nothing. The fix is not to reduce the faucet, which makes the early game feel stingy; it is to add sinks that scale into the late game: repeatable consumables, upgrade tiers with escalating costs, or a cosmetic catalogue whose top items cost several hours each.

| Flow | Form | Rate characteristic | Watch for |
|---|---|---|---|
| Source | Activity completion rewards | Proportional to play time | Scales with efficiency; skilled players inflate fastest |
| Source | Enemy and container drops | Proportional to play time, high variance | Farmable spots become unbounded sources |
| Source | Milestone and quest grants | Fixed, one-off | Safe; use for guaranteed pacing |
| Source | Daily and login rewards | Fixed per day per account | Bounded by design; safe at scale |
| Source | Player-to-player trade | Zero net creation; redistributes | Concentrates wealth; not itself inflationary |
| Sink | Consumables | Proportional to play | The workhorse drain |
| Sink | Upgrade tiers at 1.5–2.5x escalation | Exponential in the late game | Extends saturation cheaply |
| Sink | Cosmetics | Unbounded | No balance impact; carries late-game load |
| Sink | Repair and upkeep | Proportional to activity | Reads as a tax; use sparingly |
| Sink | Transaction tax on trade | Proportional to economy velocity | The main control in trade economies |

Sink design follows a small set of forms. **Consumables** are the workhorse, because they are a recurring drain proportional to play. **Escalating upgrade costs** — each tier costing 1.5–2.5x the previous — extend saturation exponentially with only a few extra items. **Repair, maintenance and upkeep** drain proportionally to activity but are widely disliked when they feel like a tax on playing rather than a cost of expansion. **Cosmetics** are a nearly unlimited sink with no balance impact, which is why they carry so much economic load in modern design. **Risk sinks** — gambling, crafting with failure chance, consumable-cost expeditions — drain aggressively and need care because they interact with the ethics of section 5.

Inflation is what happens when sources exceed sinks over time, and its symptom is that the currency's purchasing power falls until prices in any player-facing market rise without bound. In single-player games this only degrades reward salience. In games with player-to-player transfer — trading, auction houses, gifting — it compounds, because currency accumulates in the aggregate rather than being spent, and the classic outcome is that a new player cannot afford anything priced by veterans. The specific mechanisms that make transfer economies dangerous are unchecked sources of any kind, since a source exploitable at scale (a repeatable quest, a duplication bug, a bot-farmable activity) injects currency faster than any sink can remove it. The controls are hard caps on repeatable source rates per account per day, sinks that scale with wealth so the richest players drain the most, transaction taxes that destroy a percentage of every trade, and — most importantly — monitoring the money supply as a tracked live metric rather than discovering the problem from the forums.

Solo: build the economy in a spreadsheet before implementing it, with one row per source and one per sink, and check saturation and starvation at three play rates. It takes an afternoon and prevents the most common balance disaster. Studio: the economy is an owned discipline with a simulation harness that runs thousands of synthetic player careers against the live tuning data, a nightly report on money supply and per-currency inflation, and no tuning change ships without passing that simulation.

## 2. Currencies: soft, hard, and the conversion rule

Multiple currencies exist to segment sinks so that one activity's rewards cannot buy another activity's rewards. Each currency needs a reason to exist stated in one sentence; a currency without one is user interface clutter and a source of confusion.

| Currency | Source | Typical role | Convertibility |
|---|---|---|---|
| Soft | Earned continuously through play | The main economy: upgrades, consumables, routine purchases | Never purchasable directly at scale |
| Hard / premium | Purchased with money; small amounts granted through play | Time-skips, cosmetics, exclusive items | Converts one way into soft, never back |
| Event / seasonal | Earned only during a limited window | Drives participation in time-limited content | Expires; does not convert |
| Progression tokens | Awarded at designed milestones | Gates specific unlocks and controls pacing | Non-convertible by design |

The conversion rule is directional and near-absolute: hard currency may convert into soft, and soft may not convert into hard. Allowing soft-to-hard conversion means players can grind their way to everything, which collapses the monetisation model; allowing hard-to-soft is the mechanism by which paying players skip grind, which is the honest form of the transaction. Any exception — a small daily allowance of hard currency earned through play — should be small enough that it functions as a taste of the premium tier rather than as a path around it, typically no more than the equivalent of 1–3% of a paying player's monthly spend.

Three currencies is a reasonable ceiling for most designs; five is where players stop tracking what buys what and the economy becomes opaque. Opacity is not neutral — it damages trust, and in a monetised game it looks deliberate whether or not it is.

## 3. Mobile free-to-play as a distinct mode

Free-to-play mobile is not premium design with purchases attached; it is a different discipline with different success conditions, and treating it as a variant is the reason most premium studios' first mobile title fails. The structural difference is that the business model requires retention over months from an audience that acquired the game for free, in sessions of 3–8 minutes, on a device with an attention environment full of competitors. Every design decision is downstream of that.

Retention is the primary health metric, measured as the percentage of players from an install cohort who return on a given day.

| Genre | D1 | D7 | D30 | Notes |
|---|---|---|---|---|
| Hypercasual | 35–50% | 8–15% | 2–5% | Monetises by ad impressions and volume, not retention |
| Casual puzzle | 40–48% | 18–24% | 8–13% | Long-lived; the strongest titles exceed these substantially |
| Midcore RPG / strategy | 35–45% | 16–22% | 8–12% | Lower reach, much higher revenue per player |
| Social / simulation | 38–45% | 17–23% | 9–14% | Retention driven by social obligation |
| Broad benchmark: acceptable | ~35% | ~15% | ~6% | Below this, user acquisition rarely pays back |
| Broad benchmark: strong | 45%+ | 22%+ | 12%+ | Top decile territory |

The relationships between the tiers are more useful than the absolute numbers. D1 measures whether the first session delivered on the store page's promise — a weak D1 is an onboarding problem, not a game problem. D7 measures whether the core loop survives repetition. D30 measures whether the meta layer gives a reason to keep returning. Diagnose in that order, because fixing the meta layer when D1 is broken changes nothing: you cannot retain at day 30 players who left at minute four.

The economics that constrain the design: roughly 1.5–3% of players ever pay in a typical title; the top 10% of payers generate 60–70% of revenue and the top 1% often 40–50%; and user acquisition only works if lifetime value exceeds cost per install with a payback period the business can finance, usually 90–180 days. That last constraint is why free-to-play games are designed around long-term retention rather than around a strong first hour, and why a title with excellent day-1 numbers and weak day-30 numbers is commercially worse than the reverse.

## 4. Session pacing mechanics: energy, timers, and daily loops

Energy systems cap play by spending a regenerating resource per activity — a common configuration is 5 units regenerating one per 20–30 minutes, with each play costing one. Three mechanisms make them attractive to operators and each has a cost. They cap session length, which converts one long session into several short returns and drives daily active user counts. They create a sink for premium currency, since refills are the most common first purchase. And they pace content consumption so a player cannot exhaust months of content in a weekend.

The cost is that they are the single most disliked free-to-play mechanic among players, because they interrupt engagement at exactly the moment it is highest, which is experienced as the game punishing enjoyment. The alternatives that achieve the same pacing goals with less friction: diminishing rewards after a daily threshold rather than a hard stop, so continued play is permitted but less efficient; content gates tied to progression rather than time; and daily quest structures that give a clear "done for today" signal without preventing further play. If an energy system is used, size the cap so that a normal session is not interrupted — the interruption should arrive at the end of an unusually long session, not in the middle of an average one.

Daily and streak mechanics work through habit formation and loss aversion, and the ethical line is whether breaking the streak is punished or merely unrewarded. A seven-day reward that resets to day one on a single missed day punishes; a streak that pauses and resumes does not. The first produces measurably better short-term engagement and worse long-term sentiment, and it is the mechanic most likely to make a player uninstall in irritation rather than drift away.

## 5. Gacha, monetisation, and the ethical line

Gacha and loot box mechanics sell randomised outcomes: a pull costs a fixed amount and returns an item drawn from a weighted distribution, typically with top-rarity odds of 0.5–3%. The mechanic works because randomised reinforcement schedules produce stronger engagement than fixed ones, which is the same mechanism that underlies gambling, and pretending otherwise in a design discussion is not a viable position.

The regulatory landscape has moved consistently in one direction — toward mandatory disclosure and restrictions on minors — and any design should assume it will continue.

| Jurisdiction | Position | Practical requirement |
|---|---|---|
| Japan | Complete gacha (kompu gacha) prohibited since 2012 | No mechanics requiring a full set of random items to unlock a reward |
| China | MIIT disclosure rules since 2017; minor spending and playtime limits since 2019 | Publish drop rates; enforce age-based spending caps |
| South Korea | Game Industry Promotion Act amendment in force since March 2024 | Mandatory probability disclosure with penalties for inaccuracy |
| Belgium | Paid loot boxes treated as gambling under national gaming law since 2018 | Titles commonly remove paid random mechanics for that market |
| Netherlands | 2018 enforcement action, partially reversed on appeal in 2022 | Unsettled; treat as high-risk |
| United Kingdom | Industry self-regulation following the 2022 DCMS review | Age-gating, parental controls, spend transparency expected |
| European Union | Consumer-protection scrutiny of in-game currencies and dark patterns | Expect price transparency in real currency and clear cancellation |
| United States | FTC enforcement on dark patterns and children's privacy, including a $245 million settlement over Fortnite purchase flows in 2023 | No deceptive purchase flows; strict COPPA compliance |
| Platform rules (Apple, Google) | Odds disclosure required for randomised paid items since 2017–2019 | Publish odds in-app before purchase |

The ethical line, stated directly rather than dodged: **a monetisation design is predatory when it depends on the player misunderstanding it, or on their inability to stop.** That single test resolves most cases. Selling a cosmetic for a clearly stated price is not predatory even if it is expensive, because the player understands the transaction. Selling a random pull whose odds are concealed is predatory, because the player cannot know what they are buying. Offering a limited-time bundle is a legitimate marketing device; escalating the offer's size and urgency in response to an individual's spend telemetry is predatory, because it targets identified vulnerability. Obscuring real-money cost behind three layers of intermediate currency and awkward bundle sizes is predatory, because the obfuscation exists to defeat comparison.

The concrete commitments that follow, and they are implementable rather than aspirational: publish odds, including pity-counter behaviour, before purchase. Implement pity mechanics — a guaranteed top-rarity result at a bounded number of pulls, commonly 60–90 — and state the bound. Show real-currency prices alongside soft prices. Offer bundle sizes that divide evenly into item costs, so leftover premium currency is not manufactured. Provide self-imposed spending caps and honour platform-level parental controls. Exclude accounts identified as belonging to minors from randomised paid mechanics entirely. Refuse personalised pricing or offer escalation keyed to individual spend behaviour. And apply the disclosure test to any new mechanic before building it: if explaining precisely how it works to the player would reduce its revenue, it is monetising a misunderstanding.

On whales: a small number of players spending thousands is not inherently unethical, since some are wealthy enthusiasts making an informed choice, and treating all high spenders as victims is both inaccurate and paternalistic. What is unethical is a design tuned specifically to extract from the subset who cannot stop — identified through spend velocity, session compulsion patterns and response to urgency triggers — and then targeted with escalating offers. The distinction is between accepting large voluntary spend and engineering it from identified vulnerability. Studios that take this seriously implement spend velocity monitoring that triggers a cooling-off intervention rather than a targeted offer, which costs revenue and is the only version of the commitment that is real.

Solo: if you are shipping premium or ad-supported, this section reduces to being honest about price and not using countdown pressure. Studio: monetisation designs require documented review against the disclosure test, live monitoring of spend distribution by cohort with an escalation path for outlier accounts, per-market compliance configuration, and a named accountable owner who is not the person whose bonus depends on revenue.

## Pass conditions

Answer yes to every applicable line before the design is considered sound.

1. The economy exists as a source-and-sink model, with saturation and starvation checked at three play rates before implementation.
2. Every repeatable source has a rate cap, and the aggregate money supply is monitored if currency can move between players.
3. Each currency has a one-sentence reason to exist; hard currency converts to soft and never the reverse; the total count is three or fewer where possible.
4. For free-to-play titles, D1, D7 and D30 retention are measured by install cohort and diagnosed in that order.
5. Session-capping mechanics, where used, interrupt only unusually long sessions, and streak mechanics do not punish a single missed day.
6. Odds for any randomised paid mechanic are published before purchase, pity bounds are stated and implemented, real-currency prices are shown, and bundle sizes divide evenly into item costs.
7. No offer size, price or urgency is personalised against an individual's spend telemetry, and high spend velocity triggers a cooling-off path rather than a targeted offer.
8. Every monetisation mechanic passes the disclosure test: explaining exactly how it works would not reduce its revenue.
9. Per-market regulatory requirements for randomised mechanics and minors are configured and verified rather than assumed.
