# Shipping and Live Operations: Patching, Save Data and the Live Calendar

Once the game is out, the shape of everything that follows is set by how fast a fix can reach a player and how much of the game can change without one. This file covers patch certification and cadence, patch size and packaging, forced updates, save data and account migration, the live-operations calendar, and what a live game costs in headcount. Launch operations live in `shipping-launch-and-incidents.md`; crash reporting, trust and safety and sunsetting live in `shipping-stability-trust-and-sunset.md`.

## 1. Patching: certification, cadence and the first weeks

Patch certification times are the constraint that shapes the whole post-launch plan, and they differ by platform enough to change what is possible.

| Platform | Patch turnaround, typical | Emergency path | Consequence for planning |
|---|---|---|---|
| PlayStation, Xbox, Switch | 3–10 business days | Exists, limited, consumes goodwill | A client fix is a week away; assume it |
| Steam, Epic, GOG | Minutes to hours | Not needed | PC can iterate daily; resist letting that diverge the platforms |
| iOS | 24–48 hours typical | Expedited review by request | Policy rejections add days unpredictably |
| Android | Hours to days, staged rollout available | Halt rollout rather than patch | Staged rollout is a genuine safety mechanism; use it |
| Server and remote config | Minutes | Immediate | Everything that can live here should |

The consequence is a cadence rather than a stream. Plan a hotfix within the first 72 hours for whatever the launch surfaces, a substantial patch at two to three weeks once the data is in, and a monthly rhythm after that, with server-side changes flowing continuously between them. Batch console fixes into scheduled patches instead of submitting continuously, because each submission consumes certification slots and each carries the risk of a failed pass.

Two disciplines keep this sustainable. Keep the platforms on the same content version even when PC could move faster, because divergence multiplies the test matrix and confuses the community. And maintain a release branch separate from mainline from launch onward, with fixes cherry-picked into it, so a hotfix does not carry six weeks of unrelated development with it.

## 2. Patch size, chunking and delta patching

A 40 GB download for a one-line text fix is not bad luck; it is a packaging architecture that has failed, and the mechanism is worth understanding precisely because it is invisible until the first patch.

Platform patching systems compute deltas over the package files. If the game ships as a small number of enormous archives, and a build regenerates those archives with different internal ordering, different compression block boundaries or different padding, then every byte offset after the first change differs and the delta is the size of the archive. Three things cause it: content sorted by an order that is not stable across builds, whole-archive compression rather than block-aligned compression, and asset identifiers or timestamps embedded in the package that change every build.

The fixes are all packaging decisions made before launch. Chunk content into many archives along ownership and streaming lines so a change invalidates one chunk. Keep asset ordering within an archive deterministic and stable across builds, so unchanged content lands at the same offsets. Use block-aligned compression so a changed block does not shift the rest. Keep frequently changing data — configuration, balance tables, localisation strings — in small separate files rather than embedded in a large archive with rarely changing content. And strip build timestamps and non-deterministic identifiers from packaged data.

Targets to hold: a fix patch under a few hundred megabytes, a content patch under a few gigabytes, and a measured patch-size report produced by CI for every build against the previous release, so a regression in patch size is caught before it ships rather than after players complain. Studio: make that report a build metric with an alert threshold, because patch size is invisible to everyone until the first patch and by then the packaging is baked into a shipped product.

## 3. Forced updates and version gating

Multiplayer requires protocol and content agreement, so a patch is effectively mandatory for anyone who wants to play online. Handle it explicitly. Serve the minimum supported client version from remote configuration rather than hardcoding it, so the gate can be raised without a patch. Give a grace window where an outdated client can still play single-player or offline content. Tell the player what is happening in specific terms — the version they have, the version needed, the download size — rather than ejecting them to a store page with a generic error.

Where the design permits, prefer backward compatibility for a release or two: version the network protocol, accept the previous version's messages, and retire it on a schedule. The cost is a compatibility layer; the benefit is that a patch does not fragment the player base into people who have updated and people who have not, which matters most for the very patch that fixes something urgent.

## 4. Save data, migration and accounts

Save data outlives the code that wrote it, which makes its format a compatibility contract with every future patch. The decisions are cheap before launch and permanent after it.

Version every save and every profile record explicitly, and write migration code that upgrades old versions forward on load rather than assuming a shape. Prefer a format where unknown fields are ignored and missing fields take defaults, so a save written by a newer build does not destroy a player's progress when they roll back and an older save loads into a newer build without special handling. Never write a save format that only the current build can read, and never remove a migration path once it has shipped — a player who returns after two years should load, and their save is from a version nobody remembers.

Write saves atomically: to a temporary file, flushed, then renamed over the original, keeping at least one backup generation. The failure this prevents is corruption on power loss mid-write, which is both a certification requirement and one of the most damaging support categories that exists, because the player loses something they cannot get back. Handle the corrupted case explicitly by falling back to the backup and telling the player what happened, rather than presenting an empty profile.

Cloud saves and cross-progression add conflict resolution, which needs a rule chosen deliberately rather than a last-writer-wins default that silently discards a session. Present the conflict to the player with enough information to choose — device, timestamp, progression summary — and keep both until they do. Account linking across platforms is an identity system with its own security surface: linking, unlinking, merging and recovery each need a designed flow, and account recovery is where support cost concentrates. Studio: treat progression data as a service with the same backup, restore and audit obligations as any other production data store, because restoring one player's lost progression is a routine support action and it is impossible without point-in-time backups.

## 5. Live operations: cadence, seasons and events

A live game runs on a calendar, and the calendar is the product. The industry-standard shape is a season of six to twelve weeks containing a progression track, some new content, and a set of smaller events inside it, with a beat every week or two so a returning player always finds something new.

The production consequence is a pipeline that runs several seasons ahead. While season N is live, season N+1 is in certification or final QA, N+2 is in production, and N+3 is in design. That means a live team is always working on content whose reception it cannot yet see, and that changes what data can influence what: telemetry from the current season can adjust tuning in N+1 through remote configuration, but it cannot change N+1's content, which is already built. Teams that do not internalise this promise responsiveness they cannot deliver.

| Beat | Typical cadence | Built how far ahead | Changeable late |
|---|---|---|---|
| Season | 6–12 weeks | 2–3 seasons | Only through configuration |
| Mid-season event | 2–4 weeks | 1–2 seasons | Scheduling and tuning |
| Weekly rotation or challenge | Weekly | Generated from a template | Yes, through configuration |
| Balance patch | 2–6 weeks | Days | Yes, if server-authoritative |
| Store rotation | Weekly | Configured | Yes |

Events fail in two predictable ways: the event that requires a client patch to start, which means it cannot slip and cannot be fixed, and the event that changes the economy in a way the designers cannot reverse without taking things away from players. Both are avoided by making events data-driven, server-scheduled and reversible, and by simulating economy changes against real telemetry before shipping them.

## 6. The honest cost of a live game

A live game consumes a studio, and the cost should be stated in headcount rather than in intention. Sustaining a live service at a meaningful cadence typically requires 40–70% of the original development team retained indefinitely, plus roles the project did not previously have: community management, player support, data analysis, backend operations with an on-call rota, and an anti-cheat or trust-and-safety function if the game is competitive or social.

The consequences follow arithmetically. A studio that ships a live game and intends to start the next project needs to hire, not redeploy, and the hiring happens after launch when the revenue is uncertain. The live team's schedule is dominated by a calendar it cannot slip, which means it absorbs bugs and incidents at the cost of content rather than at the cost of dates. On-call is a permanent obligation with a real human cost that must be staffed and compensated rather than absorbed by the three people who understand the backend.

Studio: decide before launch whether this is a live game, and staff it as a distinct organisation with its own leadership rather than as an extension of the project team. Solo or small team: a live game is usually the wrong choice, not because the content is hard but because the operational floor — uptime, support, cheat response, patch cadence — does not scale down and does not stop.

## Pass conditions

Answer yes to every applicable line before the game is considered ready to ship and to operate.

1. Patch cadence is planned per platform against real certification turnarounds, with platforms kept on the same content version.
2. A release branch separate from mainline exists from launch, with fixes cherry-picked rather than merged wholesale.
3. Content is chunked, asset ordering within archives is deterministic across builds, and compression is block-aligned.
4. CI produces a patch-size report against the previous release for every build, with an alert threshold.
5. Frequently changing data lives in small separate files rather than inside large archives of stable content.
6. The minimum supported client version is served from configuration, and outdated clients receive a specific message rather than a generic error.
7. Save and profile records are explicitly versioned with forward migration paths that are never removed once shipped.
8. Saves are written atomically with at least one backup generation, and the corrupted-save path is tested and reports honestly to the player.
9. Cross-progression conflicts are presented to the player with device, timestamp and progression summary rather than resolved silently.
10. Progression data has point-in-time backups and a rehearsed restore for an individual player.
11. Live content is planned two to three seasons ahead, and what can be changed late through configuration is documented so nobody promises otherwise.
12. Events are data-driven, server-scheduled and reversible, and economy changes are simulated against real telemetry before shipping.
13. The live team is staffed as its own organisation with named community, support, data and backend operations roles.
