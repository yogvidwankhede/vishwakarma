# Production Pipeline: Milestones, Planning and Team

This part covers the human and planning structure around the pipeline: what each milestone gates, how content and memory budgets are tracked, how external vendors are fed, how estimates and dependencies behave, where work is lost between disciplines, and why crunch is a production failure rather than an effort problem. The technical pipeline itself is covered in the sibling production files.

## 1. Milestones and what each actually gates

Milestones exist to force a decision. A milestone that produces a build and a meeting but no decision is a status report with extra steps, and the discipline worth keeping is naming the decision each one gates before the work starts.

| Milestone | Definition | Decision it gates | Typical timing |
|---|---|---|---|
| Prototype | Core mechanic playable at throwaway fidelity | Is the core loop worth building? Continue or kill | Pre-production |
| Vertical slice | 10–20 minutes at final quality across all disciplines | Is the quality target achievable at this cost? Greenlight, funding, pitch | End of pre-production |
| Alpha | Feature complete: every system exists and works end to end; content may be placeholder | Stop building systems, start filling and fixing | 9–12 months before launch |
| Beta | Content complete: all content in, all strings extracted, no new features | Stop adding, start burning down bugs and preparing cert | 4–6 months before launch |
| Release candidate | Zero must-fix defects; cert build produced | Submit to platform holders | 6–8 weeks before launch |
| Gold | Cert passed, master accepted | Manufacture and release; day-one patch scope frozen | Launch |

Alpha is the milestone teams most often fake and the one whose falsification is most expensive. Feature complete means a player can reach the end of the game through every system without a programmer present, using placeholder content. A project that declares alpha with three systems still in design has not moved its risk; it has moved its reporting. The reason alpha matters is that everything after it — balance, difficulty tuning, localisation extraction, performance optimisation, certification testing — depends on the shape of the game being final. Tuning a combat system that is still being written is wasted work, and the waste is discovered later.

Beta's function is symmetrical: it makes the bug count meaningful. Before content complete, the defect curve is dominated by new content introducing new defects, so the count carries no schedule information. After it, the curve is a burn-down whose slope can be extrapolated to a date, which is the first point in the project where the launch date can be forecast from evidence rather than asserted. Studio: track open defects by severity weekly from beta and extrapolate the burn-down publicly; if the extrapolation misses the date, the response is to cut scope, and cutting is only possible while the option still exists.

Milestone builds have an external audience — a publisher, an investor, a platform holder, a marketing team — and that audience's needs are different from the team's. A publisher milestone is contractual and often tied to a payment, which means it has an acceptance criteria document that should be read at the start of the milestone rather than the end. Studio: separate the internal quality gate from the external deliverable and schedule a stabilisation window of one to two weeks before every external milestone, because a milestone build assembled the night before is how a team discovers that the version everyone plays daily does not survive being packaged.

## 2. Content budgets and the content database

Two questions run a production and neither can be answered by looking at the build: how much of the game is finished, and how close is it to the memory and performance ceiling on the worst platform. Both need a database, and both degrade into guesswork without one.

The content database — a tracker, a spreadsheet at small scale, a purpose-built tool at large — holds one row per shippable content item: a level, a character, a weapon, a cinematic, a music cue. Each row carries an owner, a state, a target milestone, an estimate and an actual. States must be few and unambiguous: not started, blockout, in progress, in review, final, cut. The value is not the individual rows but the aggregate: a burn-up of items reaching final against the milestone dates is the only honest answer to "how much is done", and it is an answer a producer can compute weekly rather than a status opinion collected from twelve leads.

Memory budgets are derived downward from the platform and enforced upward from the assets. Start with the platform's application memory, subtract the OS reserve and the engine's fixed cost, and allocate the remainder by category with a named owner per category. A category owner who is over budget must either optimise or negotiate with another owner, which converts an unbounded problem into a bounded trade with a decision-maker.

| Category | Typical share of application memory | Owner | Primary lever |
|---|---|---|---|
| Textures and streaming pool | 30–40% | Environment art lead | Resolution class, streaming pool size, compression format |
| Meshes and geometry | 10–20% | Environment/character art leads | Triangle budgets, LOD aggression, instancing |
| Animation | 5–10% | Animation lead | Compression settings, additive layering, streaming |
| Audio | 5–10% | Audio lead | Bank granularity, streaming versus resident, codec |
| Gameplay objects and script | 5–15% | Engineering lead | Object counts, pooling, data-oriented storage where dense |
| Engine, renderer and RHI overhead | 15–25% | Engineering lead | Feature enablement, render target formats, resolution |
| Slack for spikes and fragmentation | 5–10% | Engineering lead | Deliberately unallocated; consumed only by decision |

Publish the current measured value against each budget nightly, from the lowest-memory platform, on the same dashboard as build time and frame time. The mechanism that makes this work is visibility with attribution: an artist who can see that their category is at 104% will act, and an artist who learns at the optimisation milestone that the whole game is 30% over will be asked to delete work that has already been paid for. Studio: put the budget report in a channel everyone reads and name the category owner in it. Solo: check it at every milestone; the failure mode is the same, only slower.

## 3. Outsourcing and external content

At AAA scale a substantial fraction of art — commonly 40–70% of environment props, characters and animation volume — is produced by external vendors, and the pipeline decides whether that is capacity or overhead. The determining constraint is that a vendor cannot iterate against your build, so everything they need to self-check must be packaged and shipped to them.

What a workable outsourcing package contains: a technical specification with the budgets from section 2 as hard numbers, the naming convention, the export settings and the exporter itself, a reference asset that passes every gate as a worked example, a validation tool the vendor runs before delivery, a style guide with in-engine reference renders rather than concept art alone, and a defined delivery format and cadence. Vendors that can self-validate deliver assets that pass; vendors that cannot deliver assets that are reviewed, rejected, reworked and re-reviewed, at three times the internal cost in lead time.

Review capacity is the constraint that gets underestimated. A vendor delivering 200 assets in a batch consumes an internal art lead's week to review, and that lead is also the person unblocking the internal team. Chunk deliveries into weekly batches of a reviewable size, budget the review time explicitly in the lead's schedule, and treat unreviewed deliveries as work in progress rather than as done — an asset that has been paid for but not reviewed and integrated is a liability, not an achievement.

Security and access are a real cost line. Platform holders require unreleased hardware and SDK material to be handled under NDA on controlled networks; publishers commonly require vendor sites to be audited. A co-development partner who needs depot access needs a proxy or edge server at their site, a workspace policy and a stream of their own, and the integration overhead of merging their stream is a scheduled engineering activity rather than a background one. Studio: appoint an outsourcing coordinator when external headcount passes roughly ten people; below that a lead can absorb it, above it the coordination is a full-time job and doing it part-time silently taxes the leads.

## 4. Estimation, dependencies and the schedule

Estimates are wrong in a predictable direction, and the useful response is structural rather than exhortative. Engineers and artists estimate the work they can see and omit integration, review, iteration, bug fixing and the second pass that every creative task needs; the resulting estimate is typically 40–60% of the eventual actual. Telling people to estimate better does not work and has not worked; multiplying by a measured historical factor does, and the factor should be computed from the project's own estimate-versus-actual record rather than borrowed.

Dependencies are what turn individual slips into schedule slips. A task whose output feeds four other tasks has a slip cost four times its own duration, and the tasks with that shape are consistently the same ones: the blockout that art depends on, the animation rig that every animator depends on, the character controller that every combat task depends on, the UI framework that every screen depends on, the localisation pipeline that every string depends on. Studio: identify the fan-out tasks in pre-production and schedule them first with deliberate slack, because slack on a fan-out task buys four times its own duration in downstream protection.

The three responses to a slip are to cut scope, move the date or reduce quality, and the discipline is to name which one is being chosen. A slip absorbed without a named response is being paid for by the team's evenings and will surface as section 6. Studio: hold a scope review at every milestone with a pre-ranked cut list prepared in advance, and record which response was chosen and by whom, because the record is what makes the next estimate better.

## 5. Team structure and handoffs

Work is lost at boundaries, not inside disciplines. Each handoff below has a characteristic failure and an artefact that prevents it, and the artefact is cheaper than the failure by roughly an order of magnitude.

| Handoff | Characteristic failure | Artefact that prevents it |
|---|---|---|
| Design → engineering | Spec underspecifies edge cases; engineer invents behaviour; designer rejects the result | A written spec with failure and edge cases enumerated, reviewed before implementation |
| Design → art | Art built to an imagined layout; blockout changes after art is final | A locked blockout signed off by both before art production starts |
| Art → engineering | Assets exceed runtime budgets; discovered at optimisation | Per-class asset budgets published and enforced by the submit validator |
| Engineering → QA | Feature untestable: no way to reach the state, no debug controls | A debug menu, cheat commands and a state-jump facility delivered with the feature |
| Audio → engineering | Event names drift; hooks missing; mix done on unrepresentative content | A shared event naming schema and hooks landed before the audio content exists |
| Any → localisation | Hardcoded strings; no context; late script changes | Key-based lookup enforced by a linter; context mandatory at extraction |
| Any → certification | Requirement discovered at submission | A cert checklist pass at every milestone with a named owner |

Studio: a AAA team of eighty is roughly 25–30 engineers, 25–30 artists, 8–12 designers, 4–8 QA embedded plus an external pass, 3–5 audio, and 4–6 production, with a technical art group of 3–6 straddling art and engineering that is consistently under-hired and consistently the highest-leverage group in the building. Technical artists own the asset pipeline, the validators, the DCC tooling and the shader authoring conventions, which means understaffing them converts directly into artist hours lost to manual work.

Solo: the handoffs still exist, they just happen inside one head across time, and the artefacts still pay — the spec you write in month two is what stops you rebuilding the system in month nine because you forgot why it worked that way.

The producer's function in this structure is to own the flow of information rather than to assign work: to know where each thread is, to see the dependency that is about to bite, and to force the decisions that leads are avoiding. Studio: a ratio near one producer per fifteen to twenty contributors is typical; under-resourcing production does not save money, it converts into leads spending half their time coordinating and half their time doing the work they were hired for, badly.

## 6. Crunch is a production failure with a mechanism

Stated plainly, because hedging it is how it persists. Sustained overtime does not produce more output. Measured productivity per hour falls as weekly hours rise past roughly 50, and total weekly output flattens and then declines somewhere between 55 and 60 hours; beyond that, defect injection rates rise, so the work produced in week eight of crunch generates bugs that consume the time saved in weeks one through four. The team is paying overtime to accumulate technical debt.

The second mechanism is attrition. Crunch's departures come after ship, they are concentrated among senior people with options, and each replacement costs recruitment plus 3–9 months of ramp before they are productive on a codebase of this size. A studio that crunches a title routinely loses the institutional knowledge that would have made the next title cheaper, which is why the second crunched project is worse than the first.

Crunch is a symptom with a single cause: scope was not cut when the schedule slipped. The schedule slipped because estimates were optimistic, which is normal and forecastable; the failure is the decision not to respond. The available responses are to cut scope, move the date, or add people (which is slow and, past a point, counterproductive on a project already in progress). Overtime is not a fourth option; it is the appearance of one. Studio: make scope reduction a standing agenda item at every milestone review with a pre-agreed cut list ranked before it is needed, because cutting under pressure without a prepared list produces panic cuts that damage the game more than the feature was worth.

The practices that actually prevent it are unglamorous and structural: estimate with a measured historical factor rather than optimism, schedule fan-out tasks early with slack, cut at milestone reviews from a prepared list, keep the pipeline fast enough that people are not waiting, and measure weekly hours so the trend is visible before it becomes a culture. Studio: publish hours worked as a tracked metric at the same cadence as defect count. A number that is measured and visible is one leadership can be held to; a number nobody records is one that only appears in exit interviews.

## Pass conditions

Answer yes to every applicable line before the project is considered correctly set up.

1. Each milestone names the decision it gates, and alpha means feature complete in the strict sense that a player can reach the end without a programmer present.
2. Open defects by severity are tracked weekly from beta and extrapolated publicly to a date, with a pre-ranked scope cut list prepared before it is needed.
3. Memory budgets are derived from the lowest-memory platform, allocated by category with a named owner each, and the measured value against each budget is published nightly.
4. A content database holds one row per shippable item with owner, state and target milestone, and a burn-up of items reaching final is reported weekly.
5. Outsourcing packages include the validator, the exporter, the budgets and a worked reference asset, and review capacity is scheduled explicitly against delivery batches.
6. Estimates are multiplied by a factor computed from this project's own estimate-versus-actual record, and fan-out tasks are scheduled first with deliberate slack.
7. Every feature ships with the debug controls and state-jump facilities QA needs to test it.
8. Sustained weekly hours are tracked, and a milestone requiring overtime triggers a scope decision rather than a schedule of overtime.
