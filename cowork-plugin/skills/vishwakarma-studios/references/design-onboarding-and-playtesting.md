# Design: onboarding, tutorialisation, level design, and playtesting

This part covers how a player is brought into the loop and how you find out whether it worked: the first ten minutes, teaching through level design, level pacing and legibility, playtesting method, and the telemetry that answers what observation cannot. Numbers are stated for a specific genre and scale where they differ; where a number is given without a qualifier it is a starting value to tune from, not a law.

## 1. The first ten minutes

Onboarding is measured as a funnel, and the drop-off distribution is unforgiving: for a mobile title, a substantial fraction of installs never complete the first session, and for a premium title the refund window and the two-hour Steam threshold make the first hour commercially decisive. The first ten minutes therefore get design attention out of proportion to their length.

The structural requirements, in order of appearance. The player should be performing the core verb within 60 seconds of gaining control, because the store page promised that verb and every second before it is spent on a promise not yet kept. The first meaningful choice should arrive within 3–5 minutes, since agency is what distinguishes playing from watching. The first satisfying completion — a defeated enemy, a solved puzzle, a reached destination — should land inside the first 5 minutes to establish that the loop closes. And the first ten minutes should contain no more than two or three new mechanics, however many the full game has.

The three failures that recur. **Front-loaded exposition**: cutscenes, lore and character introduction before the player has any reason to care, which spends the player's most valuable attention on context rather than experience. **Menu-first onboarding**, common in free-to-play, where the player meets the economy, the shop and four currencies before the game. And **capability inversion**, where a prologue grants full power that is then stripped away — a device that works when the loss is the story's subject and reads as a bait-and-switch when it is a tutorial convenience.

Instrument the funnel step by step: percentage reaching first control, first core-verb use, first completion, first choice, first save, end of first session, and second session. The step with the largest drop is the one to fix, and it is almost never the step the team expects. Re-measure after every change, because onboarding is the part of the game most often broken by unrelated work.

## 2. Tutorialisation: teach through level design

A tutorial popup is a design failure, and the mechanism is specific. Text delivers declarative knowledge ("press X to dodge") while play requires procedural knowledge (dodging at the right moment), and the two are stored and retrieved differently — players routinely read an instruction, dismiss it, and are unable to perform the action ninety seconds later. Popups also arrive at the moment of highest engagement and interrupt it, which trains players to dismiss them unread. Instrumented builds consistently show tutorial text dismissal within one to two seconds, far below reading time.

The alternative is to teach with constrained level design: build a situation in which the correct action is the only one available and its consequence is immediately legible. The player learns by doing, in context, and the knowledge is procedural from the start.

The four-step pattern that structures this, applied per mechanic:

| Step | Purpose | Design constraint |
|---|---|---|
| Safe introduction | The player performs the action with no failure penalty | Nothing else competes for attention; failure costs a retry, not progress |
| Application | The action is required against mild pressure | One mechanic only; the solution is unambiguous |
| Twist | The action is combined with something else, or its context is inverted | Requires understanding, not memorised inputs |
| Mastery test | The mechanic under real pressure, with real stakes | Failure is meaningful; success confirms the skill is owned |

A worked instance for a wall-jump: a shaft the player cannot exit without wall-jumping, with no hazard (introduction); a gap crossable only by wall-jumping, with a short fall as the failure cost (application); a wall-jump onto a moving platform, or a wall-jump away from a hazard (twist); a wall-jump sequence in a timed collapse or under enemy fire (mastery test). Each step is a piece of level, not a piece of text.

Supporting rules. Teach one mechanic at a time, and allow 3–10 minutes of use before introducing the next in the opening hour. Introduce mechanics in the order they become necessary rather than in the order they are technically implemented. Signpost with the environment — light, colour, contrast, motion, converging lines — before resorting to a marker. If a mechanic genuinely needs text because it has no physical analogue (a resource system, a crafting rule), keep it to one sentence, make it dismissible, and make it retrievable from a reference the player can consult when the need arises rather than when you decided to explain it. And measure the result: a tutorial's success criterion is that a fresh player performs the mechanic correctly on first demand ten minutes later, not that they saw the instruction.

Solo: teach through three or four purpose-built rooms at the start of the game and test them on someone who has never played it. Studio: onboarding is a tracked funnel with instrumented step completion, a dedicated designer owns the first hour, and comprehension is verified per mechanic with a measured first-demand success rate rather than by review.

The strongest version of the discipline is that the tutorial is indistinguishable from the game. Players should not be able to identify where the tutorial ended, because nothing was ever separate from play.

## 3. Level design: pacing, legibility, and the golden path

A level is a sequence of experiences with a rhythm, and it must simultaneously be navigable without conscious effort. Those two goals — interest and legibility — generate most of the craft.

**Pacing.** Alternate intensity in the sawtooth in design-progression-rewards-and-difficulty.md, at the level scale: an encounter of 90–180 seconds, then 20–40 seconds of recovery — traversal, looting, environmental storytelling — then the next beat, with the peak intensity of each cycle trending upward toward a climax and dropping sharply afterwards. Continuous high intensity for more than about 10 minutes produces fatigue rather than excitement, and the physiological reason is that arousal cannot be sustained; the design consequence is that the recovery passages are functional, not filler.

**Sightlines and landmarks.** Show the player where they are going before they need to go there. A vista revealing the destination gives the whole subsequent traversal a direction and converts navigation into anticipation. Place distinct landmarks — silhouette-legible, unique in colour and shape — at 40–100 m intervals in open spaces so orientation is possible without a map, and make sure each is visible from several approaches, because a landmark visible only from one angle is a landmark that stops working the moment the player turns.

**Affordance and signposting.** The player must be able to tell what is interactive from a distance and while moving. Consistency is worth more than intensity: one visual language for climbable surfaces, applied everywhere, teaches itself in five minutes and works for the rest of the game, whereas painted markers applied inconsistently are noticed, resented and still fail. The "yellow paint" criticism levelled at modern games is not really a criticism of markers; it is a criticism of markers used as a substitute for composition. Use light, contrast, framing and motion to draw the eye first, then add an explicit marker only where those fail — and verify with playtests that they fail before adding it.

**The golden path and the critical path.** The critical path is the minimum route through required content; the golden path is the route the designer expects most players to take, including the optional content they will naturally encounter. Design the golden path deliberately and measure the actual paths taken with telemetry, because the gap between them is where levels fail. A common ratio for open-structure games is 30–40% of content on the critical path and 60–70% optional, with optional content placed adjacent to the critical path — visible from it, reachable with a short detour — because content the player never sees is content that was never worth its budget.

Solo: build one level properly and reuse its rhythm as a template rather than designing each level from nothing. Studio: pacing charts, sightline and landmark passes, and a signposting review are separate scheduled steps with separate owners, and every level is walked by someone who did not build it before it leaves grey-box.

**Loops over dead ends.** A level built from loops that return to a hub allows backtracking without retracing, which reduces the perceived cost of exploration. Dead-end branches must reward proportionally to their length, and the player must be able to judge that length before committing, or exploration is punished and stops.

## 4. Playtesting methodology

Playtesting is a measurement instrument and it is easy to break. The rules below are what preserve the signal.

**Fresh eyes are consumed on first use.** Every tester can be new to your game exactly once. First-session data — where they get lost, what they try, what they misunderstand — is irreplaceable, so plan the cohort against the questions you will need answered over the whole project, and never spend a fresh tester on a build that is not ready to teach you something. Returning testers remain useful for balance, depth and long-term engagement, and are worthless for onboarding questions from that point onward.

**Cohort sizes.** For usability and comprehension problems, 5 testers surface the large majority of issues, and the returns fall off sharply beyond 8 because the same problems repeat. For questions about fun, balance and difficulty, individual variance is much wider and 12–25 sessions are needed before a pattern is trustworthy. For statistical questions about conversion, retention or completion rates, no in-person cohort is sufficient and the answer comes from instrumented telemetry across thousands of players.

**Do not explain the game.** The single highest-value rule. Hand over the controller, say nothing beyond "play as you normally would; I cannot help you", and let them struggle. Every explanation you give is a defect you have concealed, because the shipped game will not have you sitting next to it. If a tester is stuck for more than a few minutes and is visibly distressed, note the timestamp precisely, then unblock them with the minimum possible intervention and record what it cost.

**Observe rather than ask.** Watch hands, eyes and posture. Where the player looks first on entering a room, what they try before the intended solution, when they lean forward, when they check their phone — these are data. Direct questions produce rationalisation: players are excellent at reporting *that* something felt wrong and unreliable at reporting *why*. "The gun feels weak" usually means the feedback layer is thin rather than that damage numbers are low, and implementing the literal request often makes the game worse. Take symptoms from players and diagnoses from yourself.

| Observe | Do not ask |
|---|---|
| Where the eye goes on entering a space | "Was the level clear?" |
| What is attempted before the intended solution | "Did you understand the puzzle?" |
| Time between failure and re-attempt | "Was it too hard?" |
| Whether an ability is used unprompted after being taught | "Do you remember how to dodge?" |
| The moment posture changes or attention leaves the screen | "Were you bored?" |
| Which path is taken at a fork with no marker | "Was navigation confusing?" |
| Whether the player re-reads UI they have already seen | "Is the interface clear?" |

**Question technique.** Prefer past-tense and specific: "what were you trying to do there", "what did you expect to happen when you pressed that", "tell me about the moment you stopped". Avoid leading and hypothetical questions — "would you like it if there were more enemies" produces a polite yes with no predictive value. Think-aloud protocol gives good insight into intent at the cost of some naturalness; a silent session with a post-play interview preserves natural behaviour. Use both across the cohort.

**Instrument the build.** Record deaths with position and cause, time in each region, path traces, menu opens, retries per encounter, quit points, and the time to first success at each taught mechanic. Twenty instrumented sessions answer questions no amount of watching can, particularly about where levels lose people. Death heatmaps and quit-point distributions are the two highest-value visualisations, and both are cheap to produce.

Solo: three to five strangers, once a month, silent observation, notes taken during rather than after, and a rule against speaking. Studio: a dedicated user research function with recruitment against defined player profiles, recorded sessions with synchronised telemetry, structured coding of observations, findings routed to named owners with severity ratings, and a scheduled re-test to verify that fixes worked.

## 5. Metrics that matter, and metrics that mislead

Telemetry answers questions that observation cannot, and it answers the wrong ones eagerly if the metric set is chosen carelessly.

| Genre | Primary metrics | Diagnostic value |
|---|---|---|
| Single-player narrative | Chapter completion funnel, quit points, session length distribution | Locates pacing and difficulty defects precisely |
| Roguelike / run-based | Runs per session, win rate by build, run length distribution, death cause distribution | Reveals dominant strategies and dead content |
| Competitive multiplayer | Match completion rate, queue times by rank, win rate by character within a skill band, rage-quit rate | Balance and matchmaking health |
| Free-to-play mobile | D1/D7/D30 retention, conversion rate, ARPDAU, session frequency, funnel step drop-off | Business viability and onboarding health |
| Open world | Region visit rates, critical versus optional content ratio, travel method usage, marker-following time | Whether the world is being explored or bypassed |
| Live service | Weekly active users, feature adoption within 7 days, event participation, churn by cohort | Whether new content is reaching anyone |

The metrics that mislead, and the mechanism in each case. **Average session length** conflates two opposite populations: engaged players in long sessions and confused players stuck on a screen. Use the distribution, and look for bimodality. **Average playtime** hides the same problem; a mean of 12 hours over a population where half quit at 40 minutes and half play 25 hours describes nobody. **Daily active users in isolation** rises with marketing spend and falls with it, and says nothing about the game; retention by install cohort is the metric that isolates product quality from acquisition. **Aggregate completion rate** hides which encounter is responsible; the funnel by step is what points at the defect. **Win rate alone** in competitive games is confounded by pick rate and by skill distribution — a character with a 52% win rate and a 3% pick rate played only by specialists is a different balance situation from a 52% rate at 30% pick rate. **Review scores and store ratings** are heavily influenced by price, launch technical state and community mood, and lag design changes by weeks. And any metric that a team is targeted on will be optimised at the expense of what it was proxying for, which is why engagement-time targets so reliably produce padding.

The rule that keeps the set honest: every metric should have a written statement of what decision it would change. A metric that would not alter any decision is being collected for reassurance and should be dropped, because dashboards with fifty numbers are dashboards nobody reads.

## Pass conditions

Answer yes to every applicable line before the design is considered sound.

1. The first ten minutes place the core verb within 60 seconds, a meaningful choice within 3–5 minutes, and a satisfying completion within 5 minutes, with the funnel instrumented step by step.
2. Mechanics are taught through constrained level design using the four-step pattern, with no more than one new mechanic per 3–10 minutes in the opening hour.
3. Tutorial success is measured by whether a fresh player performs the mechanic correctly on demand ten minutes later, not by whether the instruction was shown.
4. Level pacing alternates encounters of 90–180 seconds with recovery passages of 20–40 seconds, and no stretch of sustained high intensity exceeds roughly 10 minutes.
5. Landmarks are placed at 40–100 m intervals in open spaces, legible in silhouette and visible from multiple approaches.
6. Interactive affordances use one consistent visual language, and explicit markers are added only where composition has been playtested and shown to fail.
7. The golden path is designed deliberately, optional content sits adjacent to it, and actual player paths are measured against it.
8. Fresh-eyes testers are budgeted across the project and never spent on a build that is not ready to answer a question.
9. Playtests are run without explanation, with silent observation, and symptoms rather than diagnoses are taken from players.
10. Builds are instrumented for death position and cause, retries per encounter, path traces and quit points, and death heatmaps and quit distributions are reviewed each test round.
11. Every tracked metric has a written statement of the decision it would change, distributions are used in place of averages, and retention is measured by cohort rather than as raw daily active users.
