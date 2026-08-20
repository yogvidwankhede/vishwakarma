# Accessibility in Games: Architecture, Standards and Process

Every feature in the preceding parts is cheap or expensive depending on architectural decisions taken before the game exists, and on the process that keeps them from decaying afterwards. This part covers the seams to build in pre-production, the settings system, the guideline documents and legal requirements, how to communicate what you support, testing with disabled players, scoping under a fixed budget, and defect triage and regression. The feature-level material lives in `accessibility-input-and-motor.md`, `accessibility-visual-and-motion.md` and `accessibility-audio-cognition-and-multiplayer.md`.

## 1. Build the seams in pre-production

Every feature above is cheap or expensive depending on a small number of architectural decisions taken before the game exists. The pattern is always the same: the feature is a parameter read at the point of use, and the cost is retrofitting the parameter into code that hardcoded the value.

| Feature | Seam it requires | Cost if retrofitted at beta |
|---|---|---|
| Remapping, hold-toggle, timing scaling | Input abstraction with bindings as data and activation modes | Weeks to months; every inline input check must be found |
| Text scaling and high contrast | UI built from tokens with reflowing layout, no fixed pixel positions | Weeks; every screen relaid out |
| Colour redundancy | Semantic colour tokens and a second encoding channel designed in | Months; visual language rebuilt |
| Subtitles and captions | Every audio event carrying caption metadata, no concatenated strings | Weeks plus a re-extraction and re-translation |
| Mono mix and per-bus sliders | A bus architecture rather than direct playback | Days if buses exist, weeks if they do not |
| Game speed | Scalable time step consumed everywhere, no wall-clock assumptions | Months, and a physics regression pass |
| Menu narration | Focus model with labelled elements and a narration channel | Weeks per screen |
| Settings themselves | A settings system with change events, persistence and presets | Small, but it blocks everything else |

The settings system is the one to build first because everything else plugs into it. It needs typed settings with defaults, change notification so a system reacts without polling, persistence that survives updates and does not reset on a settings-file version bump, presets so a player can adopt a configuration in one action rather than twenty, and — critically — exposure at first boot before any gameplay. A player who needs the photosensitivity setting must reach it before the first cutscene, and a player who needs remapping must be able to navigate the remapping screen with the input they have. Studio: make the first-boot accessibility screen a scheduled deliverable owned by UI rather than an afterthought appended to the options menu.

## 2. Standards, guidelines and legal requirements

There is no single conformance standard for games equivalent to WCAG, and claims of "WCAG compliance" for a game should be read as either about its website or as marketing. What exists is a set of guideline documents, one platform-holder requirement set with real enforcement, and a growing body of law.

| Source | Status | What it is |
|---|---|---|
| Xbox Accessibility Guidelines (XAG) | Platform holder guidance, partly required for Xbox certification | Roughly two dozen guidelines with concrete test cases; the most actionable single document |
| Game Accessibility Guidelines | Community standard, no enforcement | Tiered basic / intermediate / advanced list; the best checklist for scoping |
| CVAA (United States) | Law, FCC-enforced | Requires in-game advanced communications — text, voice and video chat — to be accessible; the games industry waiver expired at the end of 2018 |
| European Accessibility Act | Law, applicable from June 2025 | Covers e-commerce and consumer services; storefronts, purchase flows and service elements are in scope, with the game content itself contested |
| Section 508 / EN 301 549 | Procurement standards | Relevant if selling to government or education, including serious games and simulation |
| AbleGamers APX | Practitioner framework | Accessible Player Experiences: design patterns organised by player need rather than by impairment |
| Can I Play That, SpecialEffect | Community resources | Reviews written by disabled critics; hardware and setup expertise |

CVAA deserves the most attention because it is enforceable and specific. If the game ships in the United States with text chat, voice chat or video chat, those features must be usable by people with disabilities — which in practice means text-to-speech and speech-to-text options for chat, accessible chat UI, and the ability to use the communication features without requiring an input the player cannot produce. Record-keeping and a designated contact are part of the obligation. Studio: assign this to a named owner alongside platform certification, because it is the same kind of work and fails in the same way when it is nobody's job.

Certification interaction: platform holders increasingly require an accessibility feature declaration for store metadata, and Xbox in particular tests a subset of XAG during certification. Feature tags on store pages are also how disabled players find games they can play, so completing them accurately is both a requirement and a distribution decision.

Adopt one document as the internal standard and measure against it rather than against a general intention. The Xbox guidelines are the pragmatic choice for a console title because they come with test cases and interact with certification; the community Game Accessibility Guidelines are the better scoping tool because their tiering maps onto budget. Studio: record which document is the reference, track conformance as a percentage per tier per milestone, and treat an unmet item as a defect with an owner rather than as a wish.

## 3. Communicating what you support

A player deciding whether to buy needs specifics, and "fully accessible" tells them nothing. The information they need is a list of the actual features with the actual limits: which actions are rebindable, whether the colourblind modes apply to the world or only the HUD, whether subtitles cover ambient dialogue, whether the game can be completed without quick-time events, whether menus are narrated, and what is known not to work.

Publish that list somewhere durable — a page on the game's site, a section in the manual, and the platform store's accessibility tags — and keep it accurate through patches. Send it to accessibility reviewers before launch alongside review code, because a game whose features go undocumented gets reviewed as if it lacks them. State the gaps plainly; a known limitation communicated in advance costs far less goodwill than the same limitation discovered after purchase, and it lets a player make the decision themselves rather than gambling.

Studio: make the accessibility feature list a deliverable owned by the same person who owns the store metadata, updated at every content patch, and derived from the tested feature set rather than from the design intent. Solo: a single honest page, updated when a patch changes something, does the whole job.

Do not overclaim. Describing a game as accessible when it has a subset of features invites both reviewer criticism and, in jurisdictions with enforceable requirements, a compliance exposure that the accurate description would not have created. Claim the features you have tested, name the ones you have not implemented, and let the specifics carry the message.

## 4. Testing with disabled players

An internal checklist pass verifies that a feature exists. It cannot verify that the feature works, because the people running it do not use it the way it will be used. The two are routinely confused, and the confusion produces the characteristic failures: a remapping screen that cannot be navigated without the input being remapped; a colourblind mode that fixes the HUD and not the world; a subtitle setting three menus deep behind unreadable text; a hold-to-toggle option that misses the one hold that appears in the tutorial; a high-contrast mode that makes the interactables legible and the enemies invisible.

Testing with disabled players means recruiting participants with the relevant disabilities, paying them at a professional rate, and observing them play the real build on their own hardware and their own assistive setups. Their setup is part of the test — an adaptive controller configuration, an eye tracker, a switch array, a screen magnifier — and it cannot be simulated internally. Recruit through organisations that maintain player panels, run sessions remotely where travel is a barrier, and start early enough that findings can change design rather than only settings, which means the first session happens around vertical slice and not at beta.

What each method actually gives you:

| Method | Finds | Misses |
|---|---|---|
| Internal checklist against XAG or GAG | Missing features, obvious gaps | Whether the feature is usable in context |
| Automated checks (contrast, text size, flash analysis) | Measurable threshold violations | Everything requiring judgement |
| Expert accessibility consultant review | Design-level exclusion, prioritised recommendations | The specific friction of a specific setup |
| Play sessions with disabled players | Real blockers, workarounds, unusable flows | Statistical coverage; each session is one configuration |
| Public accessibility feedback channel post-launch | Long-tail issues across many setups | Anything you needed to know before shipping |

Studio: budget consultant review at pre-production for design-level decisions, player sessions at vertical slice, alpha and beta, and a post-launch feedback channel with a named owner. Solo: an expert review at one point plus two or three paid play sessions is a realistic and genuinely useful commitment, and it is a far better use of a small budget than a longer internal checklist.

## 5. Scoping under a fixed budget

Nobody ships everything above in the first title, and a plan that pretends otherwise produces a token pass at beta. Order the work by reach per unit of cost, and do the architectural items first regardless of their position in that order, because they are what makes the later items cheap.

| Tier | Work | Cost if designed in | Reach |
|---|---|---|---|
| Foundational | Input abstraction, settings system, UI tokens with reflow, audio buses, caption metadata | Weeks in pre-production; near-zero marginal | Enables everything else |
| First | Full remapping, subtitles with size and background, per-bus volume, hold-toggle, photosensitivity setting, colour redundancy | Days to weeks each | Very large; several affect a majority of players |
| Second | Colourblind modes, text scaling, difficulty axes, timing multipliers, aim assist exposure, mono mix, camera motion toggles | Weeks each | Large |
| Third | Closed captions for non-speech audio, menu narration, high-contrast gameplay mode, game speed, visual audio indicators | Weeks to months each | Focused but decisive for those players |
| Specialist | Full blind play, bespoke assistive integrations | Months, design-level commitment | Small in count, total in effect |

The decision rule for a constrained project: complete the foundational tier without exception, complete the first tier, and pick from the second and third tiers according to what the game's specific demands exclude — a reaction-heavy action game needs timing multipliers and game speed more than a turn-based game does, and a game whose combat readability rests on colour needs colour work before anything else. Studio: record the tier decisions and their reasons in the technical design documentation so the next title starts from the position this one reached rather than from zero.

## 6. Accessibility defects, triage and regression

Accessibility bugs are systematically under-triaged for a structural reason: they do not crash, they do not block the tester filing them, and severity is habitually assigned by how the defect affects the person who found it. Correct this by defining severity in terms of player impact rather than tester impact, and write the definition into the triage rules so it is applied by default rather than argued case by case.

| Defect | Common filed severity | Correct severity | Reason |
|---|---|---|---|
| Progression gated by a QTE with no alternative | Minor | Blocker | A group of players cannot finish the game |
| Remapping screen unusable with a single control | Minor | Blocker | It is the screen needed by the players who need remapping |
| Subtitle text clipped at 200% scale | Cosmetic | Major | The feature is present and does not work |
| Colourblind mode not applied to the world | Minor | Major | The stated feature covers half its surface |
| Full-screen flash added to a boss transition | Cosmetic | Blocker until analysed | Photosensitivity risk is a safety matter |
| Setting resets on update | Minor | Major | The player reconfigures from scratch every patch |

Regression is the other structural problem. Accessibility features decay silently as new screens and new effects are added by people who were not part of the original work: a new menu that ignores text scaling, a new full-screen effect that was never flash-analysed, a new hold action with no toggle. The mechanism that prevents this is to put the checks in the definition of done for every UI and effects ticket, and to automate what can be automated — contrast measurement over UI screenshots, text size checks against the minimum, flash analysis over captured video of new effects — in the nightly pass described in `production-pipeline.md`.

Post-launch, keep the feedback channel open and name accessibility changes explicitly in patch notes. Players who need a specific feature track it, and a fix that ships unannounced reaches nobody who was waiting for it.

## 7. The commercial argument, once

Roughly 16% of the world's population lives with a significant disability, the audience skews older every year as the player base ages, and the features overwhelmingly get used by people outside the group they were designed for — subtitles are the clearest case, enabled by around half of all players. Retrofitting these features at beta costs an order of magnitude more than designing the seams in pre-production, and the retrofit produces a worse result because settings can only reconfigure decisions that were made flexibly. That is the whole argument; it does not need repeating in design documents, and the work is justified by the same reasoning that justifies supporting a second control scheme.

## Pass conditions

Answer yes to every applicable line before the game is considered to have met the floor.

1. Accessibility settings are reachable at first boot before any gameplay, persist across updates, and are available as presets.
2. In-game text, voice and video chat meet CVAA obligations, with a named owner alongside platform certification.
3. Store accessibility feature tags are completed accurately for every platform that offers them.
4. Play sessions with disabled players using their own assistive hardware have been run at vertical slice, alpha and beta, with participants paid.
5. A post-launch accessibility feedback channel exists with a named owner and a triage path into the bug tracker.
6. A public accessibility feature list states what is supported and what is not, is sent to reviewers before launch, and is updated at every content patch.
7. The foundational and first tiers of the scoping table are complete, and the tier decisions for the remainder are recorded with reasons.
8. Triage rules define accessibility defect severity by player impact, and progression-blocking accessibility defects are blockers.
9. Accessibility checks are in the definition of done for every UI and effects ticket, with automated contrast, text size and flash checks in the nightly pass.
10. Accessibility changes are named explicitly in patch notes.
11. One guideline document is adopted as the internal standard, with conformance tracked per tier per milestone.
