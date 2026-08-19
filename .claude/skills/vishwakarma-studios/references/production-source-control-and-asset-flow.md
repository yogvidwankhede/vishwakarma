# Production Pipeline: Source Control and Asset Flow

A game is not a codebase with assets attached. It is tens of thousands of binary files — meshes, textures, animations, audio, levels, prefabs, materials — under version control, produced by people who do not use a compiler, and the pipeline is the machine that decides whether eighty of them can work on the same day without blocking each other. Almost every production failure that presents as a schedule problem is a pipeline problem underneath: a level only one person can open, a build nobody can get, a cook that takes six hours so designers iterate once a day, a string that was hardcoded in month four and costs a re-record in month twenty. The pipeline is infrastructure in the load-bearing sense, and it is cheapest to build before the team arrives.

Scope: this file covers version control and asset flow; build and cook automation live in `production-validation-build-and-iteration.md`, certification and localisation in `production-certification-and-localisation.md`, and milestones and the human structure around them in `production-milestones-planning-and-team.md`. Runtime performance work lives in `rendering-pipeline.md` and the engine files; post-launch operation lives in `shipping-and-liveops.md`.

## 1. Source control for binary assets

The governing fact is that the merge tool does not exist. Two people cannot merge a `.uasset`, a `.fbx`, a `.psd`, a Unity scene with a binary serialisation mode, or a 4K texture. Text-oriented version control assumes concurrent edit and reconciliation at merge time; binary content assumes exclusive edit and reconciliation at scheduling time. This single difference — file locking enforced by the server — is why Perforce dominates AAA production, and it is not a matter of taste or inertia.

The failure without locking is specific and it is silent. Two artists open the same character rig on Monday. Both submit on Tuesday. The second submit either overwrites the first or produces a conflict whose only resolution is to pick a side, and a day of skilled work is deleted. Nothing warns anyone, no test fails, and the loss is discovered when someone notices the fix they made is gone. Locking converts that into a message at open time — "checked out by Priya" — which costs a conversation instead of a day.

| Team | Content size | Recommendation | Mechanism that decides it |
|---|---|---|---|
| 1–3, code-heavy | Under 5 GB | Git + LFS, `lockable` on binary types | Conflicts are rare enough that convention suffices |
| 3–10, mixed | 5–50 GB | Git + LFS with enforced locking, or Unity VCS (Plastic) | Locking must be enforced, not advisory, by the second artist |
| 10–30, art-heavy | 50–300 GB | Perforce Helix Core or Unity VCS | Clone-the-whole-history stops being viable; partial sync becomes necessary |
| 30–100 | 300 GB–2 TB | Perforce, effectively mandatory | Workspace views, typemap locking, editor integration, per-file history at scale |
| 100+, multi-site | 1–10 TB+ | Perforce with proxies and edge servers | Editor operations are latency-sensitive; a remote office needs local reads |

Perforce's specific properties, each doing real work. The typemap assigns file type modifiers by path and extension, and `+l` makes a file exclusively lockable server-side so the lock cannot be bypassed by a client that has not been configured correctly. Workspace views let a character artist sync 40 GB of a 3 TB depot, which is the only way a depot larger than a workstation disk remains usable. Per-file changelists and shelving allow work to be handed between people or sent to CI without being submitted. Streams provide a first-class model of branch relationships with enforced merge-down/copy-up flow. `p4p` proxies cache file content at a remote site and `p4d` edge servers additionally handle metadata locally, which turns a 150 ms link from unusable into acceptable.

Git with LFS is genuinely viable below the thresholds above and is genuinely miserable above them. LFS pointers keep the repository small but every clone still pulls the full pointer history, and the LFS store still pays bandwidth for every version of every large file anyone has ever fetched. Locking exists (`git lfs lock`) but is honoured by convention on most hosts and is easy to bypass. There is no partial sync: sparse checkout reduces working tree size but not history. The failure is cumulative rather than sudden — clone times climb from 5 minutes to 90, LFS bills arrive, and one binary merge conflict per week becomes one per day.

Unity VCS (formerly Plastic SCM) is the credible middle: it supports both centralised and distributed workflows, has real exclusive checkout, handles large binaries competently, and its GUI is comprehensible to artists in a way that Git's is not. It scales well into the tens of people and hundreds of gigabytes; above that Perforce's operational maturity, tooling ecosystem and platform-holder familiarity start to matter.

Solo: Git with LFS and a `.gitattributes` marking binary types lockable, plus discipline about not editing two things at once, is sufficient and free. Studio: budget a Perforce server as infrastructure with a named owner, a backup and restore procedure that has actually been tested, a typemap reviewed at project start, and monitoring — a depot outage stops the entire company, which is a cost worth stating in the same terms as a broken build.

Migration cost is the reason to decide early rather than to defer. Moving from Git to Perforce mid-project is a week of engineering plus a day of downtime for the whole team plus the loss or awkward preservation of history, and it is always attempted at the worst moment — the point at which the pain has become unbearable, which is also the point at which the schedule has no room. If the team is expected to reach fifteen people or the content is expected to reach 50 GB, choose the tool for that state at the start.

Studio: size the server against the failure it must survive rather than the load it must carry. Metadata performance is dominated by RAM and the metadata volume's IOPS; archive storage is dominated by capacity; both need a checkpoint-and-journal backup with a restore that has been rehearsed to completion on a spare machine, because an unrehearsed restore is an assumption rather than a backup. Replicas serve the read load of CI and analytics without contending with artists.

## 2. Depot layout, streams, and mainline discipline

Layout is decided once and lived with for years, so decide it deliberately. The structure that survives contact with a large team separates engine from game, source from derived, and content from tools:

```
//depot/Project/Main/
    Engine/          # engine source or a licensed drop, integrated not copied
    Game/
        Source/      # C++/C# game code
        Content/     # binary assets, the bulk of the depot
        Config/      # ini/asset config, text, mergeable
    Tools/           # editor extensions, exporters, internal tooling
    Build/           # build scripts, CI definitions, platform packaging
    RawContent/      # DCC source files: .ma, .blend, .hip, .psd, .spp
    Docs/
```

`RawContent` deserves its own note because teams routinely get it wrong in both directions. Keeping Maya scenes, ZBrush files and layered Photoshop documents out of version control means the only copy lives on an artist's machine and leaves when they do. Keeping them in the same depot path as engine content means every programmer syncs 400 GB of source art they will never open. The correct answer is the same depot, a separate top-level path, and workspace views that exclude it for anyone who does not author art.

Streams (or branches, if the VCS lacks streams) encode a flow, and the flow is what makes integration tractable. Mainline is the trunk and it is always buildable and always playable. Development streams branch from mainline for a team, a feature or a risky change and merge down from mainline frequently. Release streams branch from mainline at content complete and only take cherry-picked fixes. Copy up to mainline is allowed only from a stream whose CI is green.

The reason to keep branches short-lived is not process purity; it is that binary assets cannot be merged. A code branch that lives for eight weeks produces a hard but solvable merge. A content branch that lives for eight weeks produces a set of asset conflicts whose only resolution is choosing which artist's work to discard. Two weeks is a defensible upper bound for a content-touching branch; anything longer needs a written plan for how the content will reconcile.

Mainline discipline is a small number of rules with large consequences. Mainline is green or it is being fixed — nothing else is scheduled while it is red, because a red mainline blocks everyone downstream of it. The submit path is gated: a pre-flight build compiles and runs smoke tests against a shelved changelist before it reaches mainline, so a broken submit is caught in the 10 minutes it takes the pre-flight to run rather than by 80 people syncing. Studio: quantify this once and put it on a wall — 80 people at a fully loaded cost of roughly £70–130 per person-hour means a two-hour mainline outage costs £11k–21k, which pays for the pre-flight infrastructure in a week.

| Strategy | Fits | Cost |
|---|---|---|
| Single mainline, everyone submits | Under about 15 people, or code-only | Breakage is felt by everyone immediately; needs a fast pre-flight |
| Mainline plus short-lived task streams | 15–60 people | One integration per task; content conflicts stay small |
| Mainline plus per-team development streams | 60+ people | Teams shield each other from breakage; integration becomes a scheduled job with an owner |
| Mainline plus release streams | Any team approaching a ship or a live service | Fixes are cherry-picked up and down; requires discipline about what is allowed into a release stream |

Engine integration is its own branch and its own recurring job when the engine is source-integrated. Keep the vendor drop in a separate stream, merge the project onto each new engine version deliberately rather than continuously, and record every local engine modification with a reason, because an undocumented engine change is a merge conflict whose correct resolution nobody remembers. Studio: schedule engine upgrades as milestones with a named owner, a stabilisation window of one to three weeks, and an explicit decision to skip versions when the delta does not pay for the merge.

## 3. The asset pipeline: DCC to intermediate to engine

Every asset makes the same trip: authored in a digital content creation tool, exported to an intermediate format, imported into an engine format, and cooked into a platform format. Each hop is a place where information is lost, settings drift and errors are introduced, and the pipeline's job is to make every hop deterministic and inspectable.

| Stage | Typical tools | Format | Owned by |
|---|---|---|---|
| Authoring | Maya, Blender, 3ds Max, ZBrush, Houdini, Substance Painter/Designer, Marmoset, Reaper/Nuendo | `.ma`, `.blend`, `.hip`, `.spp`, `.ztl` | Artist |
| Export | Exporter scripts, HDAs, publish tools | FBX, USD, glTF, Alembic, `.sbsar`, WAV | Pipeline TD |
| Import | Engine importer with stored settings | `.uasset`, `.asset`, engine-native | Pipeline TD |
| Cook/bake | Engine cooker, texture compressor, shader compiler | Platform-native | Build engineer |

FBX remains the dominant interchange format despite being proprietary, versioned inconsistently and lossy in specific ways (custom attributes, some skinning data, unit and axis conventions). USD is displacing it for environment and set assembly because it composes — layers, references and variants let a lighting artist override a layout artist's scene without editing it. Alembic carries baked geometry caches for cloth and simulation. glTF matters mostly for web and for tool interoperability rather than for AAA authoring.

Determinism at the import step is the requirement that most repays enforcement: the same source file plus the same importer version plus the same settings must produce byte-identical output. Without it, two people who import the same FBX get two different assets, the derived data cache misses on every machine, cooks are not reproducible, and "it works on my machine" becomes structurally true rather than a joke. The concrete practices are to store import settings in the asset or in a sidecar file under version control rather than in the artist's importer dialogue, to pin the importer and engine version, and to have an automated re-import job that fails when re-importing an unchanged source produces a different result.

Naming conventions are not aesthetics; they are what makes automation possible. A validator cannot check that a normal map is in linear colour space unless it can identify a normal map, and the cheapest identifier is the name. Publish the convention as a table, enforce it at submit, and do not permit exceptions:

| Type | Prefix | Example | Notes |
|---|---|---|---|
| Static mesh | `SM_` | `SM_Crate_01` | Suffix `_LOD0..n` where LODs are separate assets |
| Skeletal mesh | `SK_` | `SK_Guard_Heavy` | Skeleton asset `SKEL_`, physics asset `PHYS_` |
| Texture | `T_` | `T_Crate_01_BC` | Channel suffix mandatory: `_BC` base colour, `_N` normal, `_ORM` occlusion/rough/metal, `_M` mask |
| Material / instance | `M_` / `MI_` | `M_Master_Hardsurface`, `MI_Crate_01` | Instances vastly outnumber masters |
| Animation | `A_` | `A_Guard_Idle_01` | Montages `AM_`, blend spaces `BS_` |
| Blueprint / prefab | `BP_` / `PF_` | `BP_Door_Sliding` | Widgets `WBP_` |
| Audio | `S_` / `SC_` | `S_Impact_Metal_01` | Cues and events separated from source waves |

The publish step between authoring and import is worth making explicit rather than leaving as "the artist exports an FBX". A publish tool that reads the DCC scene, applies the export settings, writes the intermediate file to a versioned location, records the mapping from source file and version to published file, and triggers the import is the difference between a pipeline that can answer "which Maya file produced this mesh" and one that cannot. That question is asked every time an asset needs fixing eighteen months later, and the answer is either a lookup or an archaeology project.

Texture channel packing is a small convention with a large memory consequence: occlusion, roughness and metallic each need one channel, so packing them into the RGB of a single texture costs one third of three separate textures in both memory and sampler slots. Publish the packing convention alongside the naming convention, encode it in the suffix, and have the validator check that a texture named `_ORM` is in linear space with the expected channel content, because a packed texture imported as sRGB is a subtle art bug that survives to shipping.

## Pass conditions

Answer yes to every applicable line before the project is considered correctly set up.

1. Binary asset types are exclusively lockable and the lock is enforced server-side, verified by attempting a concurrent edit and observing the block.
2. The version control choice is justified against team size and content size using the threshold table, and revisited at each doubling of either.
3. DCC source files are under version control in a separate top-level path excluded from non-artist workspace views.
4. Mainline is always buildable, submits are gated by a pre-flight build against a shelved changelist, and a red mainline halts other scheduled work.
5. No content-touching branch is expected to live longer than two weeks without a written reconciliation plan.
6. Import settings are stored under version control, the engine and importer versions are pinned, and re-importing an unchanged source produces byte-identical output.
7. A naming convention is published as a table and enforced automatically at submit, not by review.
