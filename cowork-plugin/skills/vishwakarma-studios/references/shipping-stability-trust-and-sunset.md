# Shipping and Live Operations: Stability, Trust and the End of the Game

The rest of a shipped game's life is spent defending it and learning from it: from the players attacking it, from the crashes it reports, from the bugs players describe badly, and eventually from its own ending. This file covers cheating and trust and safety, crash and error reporting, community bug triage, postmortems, and sunsetting and preservation. Telemetry design lives in `shipping-playtesting-and-telemetry.md`; incident response lives in `shipping-launch-and-incidents.md`.

## 1. Cheating, trust and safety

If the game is competitive, social or economic, it will be attacked, and the response is architectural before it is operational. The foundational rule is server authority: the client is an untrusted renderer of a simulation the server owns, and any value the client is allowed to assert — position, damage, currency, inventory, score — is a value that will be forged. Where full server authority is impractical, validate on the server against physical plausibility and rate limits rather than trusting the client's assertion, and treat every accepted client value as an accepted risk with a name.

Detection layers, from cheapest to most invasive: server-side statistical anomaly detection over telemetry, which needs no client changes and catches the crude cases; replay and demo analysis for reported players; client integrity checks and anti-tamper; and kernel-level anti-cheat, which is effective, contentious and carries real support, compatibility and privacy costs. Choose the level from the game's competitive stakes rather than by default, and state the choice publicly, because players increasingly decide what to install on that basis.

Enforcement is a process with a false-positive cost. Ban waves — batching enforcement rather than acting instantly — deny cheat developers the immediate feedback that tells them which detection tripped, at the cost of leaving cheaters active for longer. Whatever the cadence, an appeals path with a human at the end is mandatory, because automated detection has a non-zero false-positive rate and a wrongly banned player with an account they paid for is both a support problem and, in some jurisdictions, a legal one.

Trust and safety is the adjacent obligation and is frequently under-resourced until an incident forces it. Player-to-player communication and any user-generated content require moderation tooling, a reporting flow that produces evidence, escalation for threats and self-harm, and mandatory reporting paths for child sexual abuse material with the legal obligations that attach to it. Age-appropriate design codes in the UK and elsewhere impose specific requirements on services likely to be accessed by children, including default privacy settings and restrictions on profiling. Studio: staff this as a named function before launch and give it tooling, because the alternative is engineers improvising moderation during an incident with no audit trail.

## 2. Crash and error reporting

Shipping without crash reporting means learning about stability from reviews. Ship it from the first external playtest and treat its output as a primary quality signal.

Symbolication is the part that must be arranged in advance and cannot be fixed afterwards. A shipping build's stack is a set of addresses; turning them into function names requires the symbol files produced by the exact build that crashed. Archive symbols for every configuration of every build that reaches anyone, keyed by build identifier, permanently, in a location the crash reporting system can query automatically. A crash report from a build whose symbols were deleted is unactionable, and the symbols cannot be regenerated once the toolchain, the source or the build machine has moved on.

Grouping determines whether the data is usable. Crashes are grouped into issues by normalising the top frames of the stack, and both failure directions are common: over-grouping merges five distinct bugs into one bucket that is 40% of all crashes and never gets fixed, and under-grouping fragments one bug across two hundred issues so nothing looks important. Review the top buckets manually in the first weeks, split and merge by hand where the automatic grouping is wrong, and always look at the second and third frames rather than only the first, because a crash in an allocator or an assert handler groups everything by its own frame.

Crash-free session rate is the headline metric: the proportion of sessions that end without a crash. Below 99% is a stability problem serious enough to displace other work; 99.5% is a common minimum bar for release; 99.8–99.9% is a healthy shipped title on console and PC. Track it per platform, per build, per hardware SKU and per driver version, because the aggregate hides the case that matters — a 99.7% aggregate can contain a 94% figure on one GPU driver, which is a fifth of a platform's players having a broken game.

Beyond crashes, capture hangs and non-fatal errors. A hang — the game running but not progressing — is often more damaging than a crash because it does not end the session and does not generate a report unless you have a watchdog that detects a stalled main loop and reports it. Non-fatal errors, assertion failures and recoverable exceptions in shipping builds carry breadcrumbs that turn an unreproducible crash into a diagnosable one; log a bounded ring buffer of recent events with every report.

Review the crash dashboard on a fixed cadence with a named owner, daily during a launch window and weekly afterwards. Crash data decays in value: a bucket investigated during the week it appears usually still has a reproducible build, an available author and a fresh memory of the change that caused it, and the same bucket three months later has none of those.

## 3. Community, bug triage and evidence

Player reports arrive in a form engineering cannot use, and the pipeline between them is where most of the value is either created or lost. The report says "the game crashed in the desert"; the engineer needs a build, a platform, a hardware configuration, a save state, a sequence of actions and ideally a video.

Close that gap in the client. An in-game report facility that attaches the build identifier, the session identifier, the player's position, the recent telemetry breadcrumb trail, the current settings and a screenshot converts a vague report into a reproducible one at the cost of a small feature. Give support staff a lookup from a player identifier to that player's recent sessions, crashes and errors, so the first reply can be diagnostic rather than a request for information the game already knows.

Video evidence is the fastest path for anything visual or timing-dependent. Every console has a capture button and most players know it; ask for a clip explicitly in the report template, and make it easy to attach. A fifteen-second clip regularly resolves in a minute what a text description cannot resolve in a week.

Triage on two axes, because collapsing them into one is what produces mistriaged accessibility, localisation and platform-specific defects.

| Severity | Definition | Priority modifier |
|---|---|---|
| S1 | Crash, hang, progression block, save or account data loss, purchase failure, security or cheat exposure | Frequency and reach: a rare S1 on one platform may rank below a common S2 |
| S2 | Major feature broken or unusable with no reasonable workaround | Reach: how many players encounter it per day |
| S3 | Feature impaired, workaround exists | Visibility: whether it appears in the first hour |
| S4 | Cosmetic or minor | Cost to fix; batch the cheap ones |

Solo: a pinned post and a single spreadsheet do the same job as a support organisation at small scale, provided the status column is honest. Studio: publish a known-issues list and keep it current. The support cost of a bug is dominated by duplicate reports, and a visible acknowledgement with a status removes most of them; it also converts community frustration from "they do not know" into "they are working on it", which is a materially different conversation.

Duplicate detection matters more than triage speed once the population is large. A single defect can generate thousands of reports, and a support organisation without automatic clustering by symptom, build and platform spends its capacity re-reading the same issue. Cluster first, link duplicates to a single tracked defect, and reply to the cluster when its status changes; that one mechanism typically halves support load during a launch window.

## 4. Postmortems

A postmortem exists to change the next project. Everything else it does — recording history, giving people closure, satisfying a process requirement — is secondary and is what a performative postmortem produces instead.

The structure that works. A factual timeline of what happened and when, assembled from records rather than memory. What went well, stated specifically enough to be repeatable, because the practices that worked are as easily lost as the ones that failed. What went badly, stated as system behaviour rather than as personal failure. Root causes traced past the first answer — "the build broke" is not a cause, "no pre-flight gate existed for content submissions" is. And actions, each with a named owner, a date and a place in the same tracker as ordinary work, because an action that lives only in a document does not happen.

Blamelessness is a mechanism, not a courtesy. The information needed to understand a failure is held by the people closest to it, and those people are exactly the ones a blame-oriented review punishes; a single instance of blame teaches the whole organisation to withhold the next report. Ask what made the mistake possible rather than who made it, and treat every human error as a design signal about the system that permitted it.

The signs of a performative postmortem, worth naming so they can be recognised: no owners or dates on the actions, "communication" cited as a root cause without a specific mechanism, findings that exonerate everyone present, a document nobody reads afterwards, and no follow-up review of the previous project's actions. Studio: publish postmortems internally where teams can find them, hold a short review of the previous postmortem's actions at the start of the next project, and run them for incidents and milestones as well as for launches, because the postmortem of a two-hour outage is where the cheap lessons live.

Studio: keep a monthly one-page live report — retention, crash-free rate, concurrency, revenue per player, support volume, and the top three open issues — circulated to the whole team rather than to leadership alone. The team that built the thing is the team best placed to notice when a number moves for a reason nobody has proposed yet, and they cannot notice a number they never see.

## 5. Sunsetting and preservation

Every online game ends, and the ending is a design problem that deserves the same seriousness as the launch. It is also, increasingly, a regulatory one: consumer protection authorities in several territories have taken an interest in games sold as products and then rendered unplayable, and refund and disclosure obligations around virtual currency vary by jurisdiction.

The sequence that treats players decently. Announce the shutdown three to six months in advance with a specific date. Stop selling currency, passes and content immediately at announcement; continuing to sell after an internal shutdown decision is the part that attracts both anger and regulators. Let existing balances be spent, and refund or convert what cannot be. Run a farewell period with the servers in a stable state rather than degrading them quietly. Then shut down on the announced date rather than drifting.

Preservation is where the obligation extends past the players who are present. If the game has any single-player or offline-capable content, ship a final patch that removes the server dependency for it; that patch is usually small — an authentication bypass, a local save path, a stubbed service layer — and it is the difference between a game that continues to exist and one that does not. Where private servers are feasible, releasing server binaries or documenting the protocol costs little after shutdown and preserves the game entirely. At minimum, archive internally: the final client and server builds for every platform, their symbols, the source at the shipping changelist, the asset depot, the build toolchain, and a written manifest describing how to rebuild and run it. Studio: assign that archival as a task with an owner at the end of every project, because the window in which the knowledge to write the manifest still exists is roughly a month wide and closes when the team disperses.

## Pass conditions

Answer yes to every applicable line before the game is considered ready to ship and to operate.

1. Every value the client asserts that affects other players is either server-authoritative or validated against plausibility limits, and each accepted client value is a named accepted risk.
2. The anti-cheat approach is chosen from the game's competitive stakes, stated publicly, and paired with an appeals path that ends with a human.
3. Moderation tooling, a reporting flow that produces evidence, escalation paths for threats and self-harm, and mandatory reporting obligations are staffed before launch.
4. Crash reporting ships from the first external playtest, and symbols for every configuration of every distributed build are archived permanently and queryable by build identifier.
5. A test crash from a shipping-configuration build resolves to a function name in the reporting tool.
6. Crash-free session rate is tracked per platform, per build, per hardware SKU and per driver, with a target of at least 99.5%.
7. A watchdog detects and reports hangs, and non-fatal errors carry a bounded breadcrumb trail.
8. The crash dashboard is reviewed daily during the launch window and weekly afterwards by a named owner.
9. An in-game report facility attaches build, session, position, settings, breadcrumbs and a screenshot, and support can look up a player's recent sessions and crashes.
10. Triage separates severity from frequency and reach, and a current known-issues list is published.
11. Player reports are automatically clustered by symptom, build and platform, and duplicates are linked to a single tracked defect.
12. Postmortem actions have owners and dates in the same tracker as ordinary work, and the previous project's actions are reviewed at the start of the next.
13. Postmortems are run for incidents and milestones as well as launches, and are published internally.
14. A monthly one-page live report covering retention, stability, concurrency, support volume and the top open issues is circulated to the whole team.
15. A sunset plan exists that stops sales at announcement, gives three to six months of notice, and resolves outstanding currency balances.
16. An offline or server-independent path for single-player content is planned, and the final patch that enables it is scoped.
17. Final builds, symbols, source at the shipping changelist, the asset depot, the toolchain and a rebuild manifest are archived by a named owner at project end.
