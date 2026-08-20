# Shipping and Live Operations: Launch, Capacity and Incidents

Launch is a technical event with a fixed date, a load curve nobody has seen yet, and a review score that sets in two days. This file covers the run-up to release day and the operations around it: the day-one patch, capacity and load testing, remote configuration and rollback, the go/no-go decision, incident response, and the first 48 hours. Testing and telemetry live in `shipping-playtesting-and-telemetry.md`; patching cadence and live operations live in `shipping-patching-and-liveops.md`.

## 1. Launch readiness and the day-one patch

The day-one patch is structural, not a failure of discipline. Certification submission is six to eight weeks before launch, development does not stop, and the gap is filled by a patch that ships on release day. Plan it explicitly: freeze a scope for it, submit it on its own certification timeline, and make sure the disc or preloaded build is playable without it, because a player on a slow connection will start before it lands and a game that is broken without its patch produces the launch reviews.

What belongs in it: fixes discovered after submission, balance and tuning updates informed by the last playtests, and anything server-configurable that turned out to need a client change. What does not belong in it: features that were cut for time. A day-one patch that adds scope is a project that has moved its deadline without telling itself.

Solo: the rehearsal is shorter but not optional — build the release candidate, install it from the store's own preview channel on a clean machine, and play the first hour, because the packaged build is a different artefact from the one you have been running. Studio: run a release rehearsal at least two weeks before launch — deploy the launch build to production infrastructure, run the store flow with real entitlements on every platform, run the day-one patch pipeline end to end, and execute the rollback. A rehearsal that has not been executed is a document, and every step in it that has never been run is an assumption.

Launch timing itself is a technical event. Preload distributes the package in advance and unlocks it at a set moment, which concentrates the entire audience into a few minutes; a staggered unlock by territory spreads the load, and a global simultaneous unlock maximises it. Decide which you want, confirm what each platform actually supports, and confirm that the unlock mechanism has been tested — a decryption key that fails at unlock is an outage that no amount of server capacity prevents.

## 2. Capacity planning and load testing

Servers fall over in a specific order, and knowing the order tells you where to look. The stateless front end scales horizontally and is rarely the problem. The database, the matchmaking service and anything holding global state are where the failure actually occurs, because they are the components that cannot be trivially replicated and whose contention rises superlinearly with load.

Plan against peak concurrency rather than daily actives, because the servers are sized by the worst minute of the worst day. Estimate the launch peak from the wishlist or preorder count, the platform mix and the release hour distribution across time zones, then provision for three to five times that estimate, because launch peaks are routinely underestimated and the cost of over-provisioning for two weeks is trivial next to the cost of a failed launch. Cloud autoscaling helps but does not solve it: instance start times, image pull times and warm-up mean scaling lags a spike by minutes, and connection storms from a queue release can be worse than the original spike.

Load testing must use synthetic clients that exercise the real protocol — authentication, entitlement checks, matchmaking, the game session itself, telemetry ingest — at 1.5 to 2 times projected peak, with a ramp shape resembling a real launch rather than a step. What it finds that nothing else does: connection storms, retry storms after a partial failure, database lock contention, and the third-party dependency whose rate limit you did not know about. Test the failure modes deliberately too — kill a region, exhaust a connection pool, delay a dependency by two seconds — because a system's behaviour under partial failure is not implied by its behaviour under load.

Build a queue before you need one. A login queue is a controlled degradation: players wait, are told how long, and get in, which is enormously better than a system that accepts connections it cannot serve and fails everyone. Studio: rate-limit at the edge, shed load in a defined order with the least important service first, and decide in advance which features can be disabled to protect the core loop.

## 3. Rollback, feature flags and remote configuration

The rule that makes a live game operable: anything you might need to change urgently should be changeable without a client patch. A client patch on console is a certification pass measured in days; a server configuration change is measured in minutes, and the difference decides how a bad launch weekend goes.

Put behind remote configuration, at minimum: economy and drop rates, matchmaking parameters, feature enablement for anything new or risky, event and season scheduling, service endpoints, and the minimum supported client version. Put behind a server-authoritative check anything that would be exploitable if the client decided it. Ship a kill switch for every new subsystem in its first release, because the cheapest response to a broken feature is turning it off.

Rollback is a plan, not a hope, and its hard parts are stateful. Reverting a service binary is easy; reverting a database migration is not, which is why migrations should be forward-compatible — add columns rather than change them, write to both shapes during a transition, and remove the old shape a release later. Player progression written under a broken build is the other trap: decide in advance whether a rollback restores a snapshot and loses player progress, or keeps the progress and accepts the inconsistency, because deciding that during an incident produces the worse answer under pressure.

## 4. The go/no-go checklist

Run it as a meeting with named owners answering for their area, at a fixed time before launch, with an explicit decision recorded. The value is the forcing function: a checklist that is filled in privately does not surface the item somebody is quietly worried about.

| Area | Question | Owner |
|---|---|---|
| Build | Is the submitted build the one we tested, and is its changelist recorded? | Build engineering |
| Certification | Passed on every platform, with submission receipts? | Compliance |
| Day-one patch | Scoped, built, submitted, and is the game playable without it? | Production |
| Servers | Load tested at 1.5–2x projected peak; capacity provisioned at 3–5x estimate | Backend |
| Rollback | Rehearsed end to end, including the database path | Backend |
| Remote config | Kill switches present for every new subsystem, tested in production | Backend |
| Telemetry | Ingest tested at projected volume; dashboards live and being watched | Analytics |
| Crash reporting | Symbols uploaded for every shipped configuration; a test crash resolves to a function name | Engineering |
| Store | Metadata, pricing, ratings and assets correct in every territory | Publishing |
| Support | Staffed for the launch window, with known-issues documentation and an escalation path | Community |
| Legal | Consent flow, age gate and privacy policy live and correct | Counsel |
| Communications | Status page, known-issues post and an incident comms template prepared | Community |
| On-call | Rota published for the launch window with escalation and a decision-maker named | Engineering |

## 5. Incident response and on-call

A live game has incidents, and the response is a rehearsed procedure or it is improvisation under an audience. Define severities in advance, because the first argument in an unclassified incident is about how serious it is, and that argument costs the first twenty minutes.

| Severity | Example | Response |
|---|---|---|
| Sev 1 | Service down, players cannot play, data loss, purchases failing, security breach | Page immediately, all hands, public status update within 30 minutes, updates hourly |
| Sev 2 | Major feature broken, one platform or region affected, severe exploit spreading | Page during working hours plus on-call, status update within 2 hours |
| Sev 3 | Degraded performance, minor feature broken, contained exploit | Next business day, note in known issues |
| Sev 4 | Cosmetic, low reach | Ordinary backlog |

The roles that make a response coherent: an incident commander who decides and is not also debugging, a communications owner who writes to players and to internal stakeholders, and the responders. Separating command from debugging is the specific practice that most improves outcomes, because the person deepest in the problem is the worst placed to judge whether to roll back.

Communicate earlier than feels comfortable and with more specificity than a holding message. A status page and a pinned post that say what is broken, who is affected, what is being done and when the next update will arrive convert an angry population into a waiting one. Never promise a time you have not verified, and always publish the next update at the time you said, even when the content is that there is nothing new.

Every Sev 1 and Sev 2 produces a postmortem as described in `shipping-stability-trust-and-sunset.md`, and the mitigations from those postmortems belong in the same backlog as features rather than in a document. Studio: run an incident game day before launch — inject a real failure into a staging environment during working hours and run the whole procedure including comms — because the first real incident should not be the first time the rota, the paging, the status page and the rollback have all been used together.

## 6. The first 48 hours: reviews, refunds and sentiment

The launch window has a disproportionate and durable effect, because early review scores are weighted by recency in some storefronts and by volume in all of them, and a score set in the first two days takes months of good behaviour to move. Plan the window as an operation rather than as a period of waiting.

What to watch, in order of decisiveness: crash-free session rate by platform and hardware, the store's review score and the text of the negative reviews, refund rate against the platform's refund window, support contact volume by category, and the tutorial and first-session funnels. Negative review text is the most actionable data available in the first day — it names causes rather than measuring effects, and a cluster of reviews naming one specific problem is a bug report with a business consequence attached.

Refund windows are a hard clock. Storefront policies commonly allow a refund within a couple of hours of play and a fortnight of purchase, which means a launch-day defect that blocks the first two hours converts directly into refunds that cannot be recovered by fixing it on day three. That is the mechanism behind prioritising first-hour defects above everything else during the window, irrespective of how many players are affected later in the game.

Communicate through it. A pinned known-issues post updated at least daily, a statement of what is being worked on with no invented dates, and a visible acknowledgement of the loudest specific complaint each convert sentiment more than the eventual fix does. Studio: staff community and support for the window at multiples of the steady-state level, and give the community team a direct line to engineering triage rather than a ticket queue, because the twelve hours a routed report spends in a queue is most of the window.

## Pass conditions

Answer yes to every applicable line before the game is considered ready to ship and to operate.

1. The day-one patch has a frozen scope, its own certification timeline, and the shipped build is playable without it.
2. A release rehearsal has been executed on production infrastructure, including the store flow and the rollback, at least two weeks before launch.
3. The launch unlock mechanism, including preload decryption and any staggered territory schedule, has been tested end to end.
4. Capacity is provisioned at three to five times the estimated launch peak, sized from peak concurrency rather than daily actives.
5. Load testing has run synthetic clients through the real protocol at 1.5–2x projected peak, including partial-failure scenarios.
6. A login queue exists as a controlled degradation path, and the load-shedding order is decided in advance.
7. Economy values, matchmaking parameters, event scheduling, service endpoints and the minimum client version are all remotely configurable.
8. Every new subsystem ships with a kill switch that has been tested in production.
9. Database migrations are forward-compatible, and the rollback decision about player progress written under a bad build has been made in advance.
10. A go/no-go meeting is scheduled with named owners per area and a recorded decision.
11. An on-call rota with escalation and a named decision-maker is published for the launch window.
12. Incident severities, an incident commander role separate from debugging, and a communications owner are defined before launch.
13. An incident game day has been run end to end, exercising paging, the status page, the rollback and the comms template together.
14. Status updates are published at the time promised, including when there is nothing new to report.
15. Community and support are staffed at multiples of steady state for the launch window, with a direct line into engineering triage.
16. Defects blocking the first two hours of play are prioritised above all others during the refund window.
17. Negative review text is read and clustered daily during the launch window, not only summarised as a score.
