# Design: core loop, prototyping, and scope

A game is a loop the player chooses to repeat. Everything else — the story, the art, the upgrade tree, the season pass — is scaffolding around that decision, and scaffolding cannot hold up a loop that is not worth repeating. The most expensive failure in game development is discovering in month eighteen that the core loop was never fun, because by then a hundred people have built content on top of it and the only remaining options are shipping it anyway or rebuilding from the foundation. The defence is cheap and structural: prove the loop in isolation, with primitive art, before anything is built around it.

Progression, economy, difficulty and tutorialisation are all downstream of that loop. They shape how long a player keeps choosing to repeat it and how the repetition stays interesting, and each has arithmetic that can be checked on paper before it is built. Numbers below are stated for a specific genre and scale where they differ; where a number is given without a qualifier it is a starting value to tune from, not a law.

## 1. The core loop, stated in one sentence

Write the loop as a single sentence built on verbs the player performs, with no nouns from the marketing pitch. "Explore to find resources, spend resources to upgrade the ship, use the upgraded ship to survive further out, repeat" is a loop. "An immersive roguelike experience with deep progression" is not a loop, it is a positioning statement, and a team that cannot produce the first sentence does not yet have a game.

The test the sentence must pass is closure: the last verb must enable the first, or the loop is a line and it terminates. In the example above, surviving further out produces access to better resources, which closes it. Where the closure is missing, the player runs out of reason to repeat, and no amount of unlocks disguises that for long — the symptom appears in telemetry as a sharp drop-off at a consistent play time rather than a gradual decay.

Three properties distinguish a loop that survives repetition. **Variance**: each repetition differs enough to require attention, whether through procedural layout, opponent behaviour, player build choice or resource scarcity. A loop with zero variance becomes a chore in 20–40 repetitions. **Compounding**: the output of one repetition changes the input of the next, so the player is not returning to the same state. **Expression**: the player can perform the loop in ways that differ meaningfully, so skill and preference have somewhere to go.

The loop that matters is the one at the middle tier, not the largest one. Players do not experience "the campaign"; they experience the 90 seconds they are inside right now, repeated. Design attention should follow that distribution.

## 2. Loop duration tiers

Games are nested loops, and each tier answers a different question for the player. Name all four explicitly, because an unnamed tier is one nobody is designing.

| Tier | Duration | The player's question | The failure when it is weak |
|---|---|---|---|
| Moment-to-moment | 0.2–3 s | "Does this feel good to do?" | The game feels bad and no reward fixes it |
| Encounter / activity | 30 s–5 min | "Was that interesting to solve?" | Combat and challenges feel samey by hour two |
| Session | 20–90 min | "Did I accomplish something today?" | Players stop returning; sessions end at frustration, not satisfaction |
| Meta / long-term | Days–weeks | "Am I building toward something?" | Strong first week, sharp drop at day 10–20 |
| Mastery | Weeks–months | "Am I getting better at something worth being good at?" | No community longevity; no reason to replay |

Session length targets are platform-shaped and should be designed for rather than discovered. Mobile sessions run 3–8 minutes and players take 4–10 of them per day, so a session loop that requires 25 minutes to reach a satisfying stopping point fails on the format. Console and PC sessions run 45–120 minutes, which means the natural save-and-stop points should fall roughly every 20–30 minutes so a player can leave without losing progress. Handheld and Steam Deck play sits between the two, closer to 20–40 minutes.

Two worked breakdowns, because the tiers are easier to name against an example than in the abstract:

| Tier | Extraction shooter | Deck-building roguelike |
|---|---|---|
| Moment-to-moment | Aim, fire, reposition, listen (0.5–2 s) | Read the board, play a card, watch it resolve (2–5 s) |
| Encounter | Win or avoid a firefight; loot a room (60–180 s) | Clear one combat with the current deck (2–4 min) |
| Session | Complete a raid and extract with loot, or lose it (25–45 min) | Complete or fail a run (35–70 min) |
| Meta | Build a stash, unlock traders, upgrade the hideout (weeks) | Unlock cards and characters; raise the difficulty tier (weeks) |
| Mastery | Map knowledge, recoil control, engagement judgement (months) | Deck archetype knowledge, sequencing, risk assessment (months) |

The design consequence of the nesting is that a strong lower tier can carry a weak higher tier for a while and never the reverse. A game with superb moment-to-moment feel and a thin meta layer is a game people play for 15 hours and remember fondly; a game with an elaborate meta layer over dull moment-to-moment feel is a game people quit in 40 minutes and describe as grindy.

## 3. Proving the loop in isolation: the grey-box discipline

Build the core loop with primitives — capsules, cubes, untextured planes, placeholder audio, no UI beyond raw numbers — and play it before anything else exists. The purpose is to remove every variable that can flatter a bad loop: art, music, narrative framing, novelty and the sunk cost of the person who built it. If the loop is not enjoyable with capsules, it is not enjoyable, and the shipped version will have the same problem wearing better clothes.

The discipline has three rules that make it work.

**Time-box it.** Two to six weeks for a first playable loop on a small team, four to twelve on a large one. A grey-box that takes four months has stopped being a test and has become development without art.

**Give it to someone who has never seen it.** The builder cannot evaluate the loop, because they know what it is meant to feel like and their brain supplies the missing parts. The signal comes from a person who receives no explanation and no context (design-onboarding-and-playtesting.md covers how to run this properly).

**Set the kill criterion in advance.** Write down, before the prototype exists, what result would cause you to stop: "if fresh testers do not voluntarily play a fourth round, we change the loop". Criteria written afterwards are always met, because the human capacity to rationalise a result after seeing it is unlimited.

The counter-argument that grey-box hides the appeal of an art-driven game is worth answering directly, because it is sometimes correct. In games where the primary pleasure is aesthetic — a walking simulator, a narrative adventure, a mood piece — the grey-box test is testing the wrong thing, and the equivalent proof is a single fully-finished vertical slice of five minutes at final quality. The distinction is whether the player's pleasure comes from making decisions or from receiving impressions. Decision-driven games grey-box; impression-driven games slice.

Solo: grey-box for two weeks, hand it to three people who owe you nothing, and be prepared to throw it away. The prototypes you discard are the cheapest work you will ever do. Studio: the loop prototype is a formal preproduction deliverable with a named owner, a written kill criterion, an external playtest, and a greenlight decision recorded with the evidence that produced it — because the alternative is a decision made by whoever spoke last in a meeting.

## 4. Systems versus content, and where replay value comes from

Two ways exist to fill a game with things to do, and the choice determines the shape of the budget.

**Content** is authored: levels, quests, dialogue, encounters, cutscenes. It is predictable in quality, precisely paceable, and consumed exactly once at a cost per hour of finished play that runs from roughly one to several hundred thousand pounds depending on scale and fidelity. **Systems** are generative: procedural layouts, simulated factions, emergent physics, combinable abilities. They are cheaper per hour of resulting play by a large factor, they produce variety that survives repetition, and they are far harder to control — quality varies per instance, pacing cannot be guaranteed, and the debugging surface is combinatorial.

The practical rule is that content carries the first playthrough and systems carry every one after it. A game that must be excellent for 12 hours and is then finished should spend on content; a game that must sustain 200 hours cannot afford to and must generate. Most games want both, and the productive structure is authored critical path with systemic filling around it: designed set pieces at the beats that matter, generated variation between them.

Interaction depth is where systems earn their cost. Ten mechanics that interact pairwise produce 45 combinations, and the interesting design work is ensuring those combinations are meaningful rather than merely legal. This is why a small set of deeply interacting verbs — fire spreads, water conducts, wind carries, objects have mass everywhere — outperforms a large set of isolated ones, and why adding an eleventh isolated mechanic is usually worth less than deepening the existing ten.

Replay value comes from three sources and it is worth being explicit about which one a design is using: **variance**, where the content differs per run; **expression**, where the player can approach the same content differently through build, strategy or style; and **mastery**, where the player's own improvement makes familiar content a different experience. A game with none of the three is finished when the credits roll, which is a legitimate design and should be a decision rather than a discovery.

## 5. Scale: solo scoping versus studio production

**Solo and very small teams.** Scope by loop count, not by feature list: one core loop, two or three supporting systems, and nothing else. The failure mode is not building the wrong thing, it is building too many things adequately and none excellently. Apply the multiplier honestly — estimate the schedule, then double it, because the estimate omits polish, bug fixing, store preparation, marketing, and the two weeks lost to a problem nobody predicted. Cut early and cut whole features rather than trimming every feature, because half a system costs nearly as much as a whole one and delivers nothing. The decision rule for a cut: if removing it does not change the sentence from section 1, it was never core. Content is the largest cost for a solo developer, which is why procedural generation, replayable systems and short campaigns with high replay value are the structures that fit the scale.

**Studio production.** Work is organised around milestones with defined exit criteria, and the criteria are what make the milestone meaningful:

| Milestone | Exit criterion | The question it answers |
|---|---|---|
| Concept | One-sentence loop, pillars, comparable titles, market rationale | Is this worth prototyping? |
| Prototype | Core loop playable in grey-box; kill criterion evaluated | Is the loop fun in isolation? |
| Vertical slice | 5–15 minutes of gameplay at shippable quality across every discipline | Can this team build this game at this quality? |
| Preproduction complete | Pipelines proven, tools built, content cost per unit measured | Do we know what the remaining work costs? |
| Alpha | Feature complete: every system present and functional, content incomplete | Is the design settled? |
| Beta | Content complete: all content in, at quality, bugs remaining | Is there anything left to build? |
| Gold / release candidate | Certification passed, no blocking defects, performance budgets met | Can this ship? |

The vertical slice carries the most weight and is the most frequently faked. Its purpose is to establish the true cost per minute of finished content, so a slice built by the studio's best people working overtime with hand-crafted assets produces a cost estimate that the production phase cannot possibly meet — which is how projects arrive at alpha with a third of the content they planned. Build the slice with the team and the pipeline that will build the rest of the game, and record how long it actually took.

Preproduction should not end until content cost is measured rather than estimated. The single most common cause of a studio project overrunning is entering full production with an unproven pipeline, at which point the schedule is a fiction and every subsequent decision is made against the wrong numbers. Feature-complete at alpha means the design is frozen in scope, not that the design is perfect; teams that keep adding features after alpha are teams that will cut content at beta instead, and content cuts are visible to players while feature cuts usually are not.

Solo: milestones are still worth keeping in the reduced form of prototype, slice, content complete, ship — they force the same decisions at a fraction of the ceremony. Studio: each milestone has documented exit criteria agreed before the phase starts, an external review, and the authority to stop the project, because a gate that cannot fail is a calendar entry rather than a gate.

## Pass conditions

Answer yes to every applicable line before the design is considered sound.

1. The core loop is written as one sentence built on player verbs, and the last verb enables the first.
2. All four loop tiers — moment-to-moment, encounter, session, meta — are named, with a designer accountable for each.
3. Session length targets match the platform's real play pattern, with satisfying stopping points at that interval.
4. The loop has been played in grey-box, by people who received no explanation, before content was built on it.
5. A kill criterion for the prototype was written before the prototype was played, and it was honoured.
6. The balance of authored content and generative systems is a stated decision matched to the intended playtime, and the source of replay value is named as variance, expression, mastery, or none.
7. Scope is stated as a loop count with an explicit cut rule, and cuts remove whole features rather than trimming every feature.
8. Studio milestones have exit criteria agreed before the phase begins, the vertical slice was built by the production team with the production pipeline, and content cost per unit was measured before full production started.
