# Production Pipeline: Certification and Localisation

These are the two long-lead external pipelines: work that is handed to people outside the team — platform holders, rating boards, translators, voice actors — on their timetable rather than yours, and that becomes exponentially more expensive the later it starts. Build, cook and validation infrastructure lives in `production-validation-build-and-iteration.md`.

## 1. Platform certification

Certification is a compliance audit run by the platform holder against a published requirements document — Sony's TRC, Microsoft's XR, Nintendo's Lotcheck guidelines. It is not a quality bar and it is not a review; a tedious, ugly game passes and an excellent one fails if it mishandles a controller disconnect. The requirements are stable across generations, published to registered developers, and testable internally, which means every cert failure is in principle preventable and in practice caused by leaving the check until too late.

The categories that produce most failures, with the mechanism in each case:

| Category | Requirement in substance | Why teams fail it |
|---|---|---|
| Suspend / resume | Survive system suspend for hours and resume with state, session and audio intact | Network sessions time out; timers use wall clock; audio does not reinitialise |
| Controller disconnect | Detect within a short window, pause gameplay, show the platform-standard message, resume on reconnect | Disconnect during a cutscene, a loading screen or a menu is untested |
| User sign-out / profile change | Handle the active user signing out mid-session without crashing or writing to the wrong save | The account is read once at boot and cached |
| Save data | Show the platform save indicator while writing; never corrupt on power loss; handle corrupted and foreign save files | Saves are written without an atomic replace; corruption path is never tested |
| Storage full | Detect insufficient space before writing and show the platform message | Space is checked once, not before each write |
| Network loss | Return to a stable state on disconnect with no infinite load, using mandated error text | Reconnect paths are tested on a good connection only |
| Naming and terminology | Exact platform names for buttons, hardware, services and stores; no references to competing platforms | Shared UI text across platforms with a single string set |
| Age rating | Correct rating displayed with correct assets; content within the rating | Rating arrives late; content added after submission |
| Achievements / trophies | All unlockable, correctly localised, correct metadata, no duplicates | Late content changes orphan a trophy |
| Stability | No crash or hang during the cert test pass | The cert build is the first build with shipping-only configuration |
| Communications accessibility | Text and voice chat accessibility obligations where applicable (see `accessibility-in-games.md`) | Treated as a feature request rather than a requirement |

Timelines to plan against. A first-party cert pass is typically 5–15 business days per platform, run in parallel across platforms but each with its own portal, account, build and paperwork. Submit the release candidate 6–8 weeks before the launch date, which means content complete lands well before that and a day-one patch is the normal mechanism for anything fixed in between. A failure returns a defect list, and the fix plus resubmission plus a fresh full pass costs 1–3 weeks. Budget two submissions as the plan, not as the contingency.

The cost of a late failure is what makes this a production issue rather than a QA one. Three weeks before a dated launch with marketing spend committed, a cert failure means either a delay that wastes that spend or a scramble whose output is a worse day-one patch. Studio: run a full internal cert pass at alpha and at every milestone after it, staffed by a named compliance QA owner with access to the platform requirement documents, and track open cert defects as a first-class metric alongside crash count. Solo: read the requirements document for your platform once at prototype and once at alpha; the suspend/resume, controller disconnect and storage-full cases are the three that will catch you and all three are cheap if designed in.

Submission logistics are administrative work with hard deadlines, and they are commonly discovered late by teams shipping their first title. Each platform requires a developer account in good standing, a product registration, store metadata and assets in every supported language, a pricing and release configuration per territory, an age rating for every territory, an EULA and privacy policy, and export or content declarations. Store assets alone — capsule images, screenshots, trailers, descriptions — are a marketing deliverable with a deadline weeks before the build deadline, and a missing one blocks release as effectively as a crash.

Age ratings are their own pipeline. ESRB (North America) and PEGI (Europe) both work from detailed content questionnaires plus video evidence of the worst content in the game; USK (Germany) and CERO (Japan) run their own processes with their own sensitivities; IARC provides a combined questionnaire path for digital storefronts; GRAC covers Korea; and release in mainland China requires a separate and much longer approval process that is a business decision rather than a submission step. Ratings take 2–6 weeks, they require the content to be final enough to describe accurately, and a rating that arrives lower or higher than assumed changes both the store configuration and the marketing plan.

| Platform | Cert pass, typical | Patch cert, typical | Notes |
|---|---|---|---|
| PlayStation | 5–15 business days | 3–10 business days | TRC document; separate submission per region in some cases |
| Xbox | 5–15 business days | 3–10 business days | XR document; certification plus a publishing pipeline |
| Nintendo Switch | 5–15 business days | 3–10 business days | Lotcheck; historically strict on stability and naming |
| Steam / Epic | Hours to days | Minutes | Review is light; no equivalent technical cert |
| iOS / Android | 24–48 h / hours to days | Same | Policy review rather than technical cert; policy rejections are common |

## 2. Localisation

Localisation fails late and expensively for one structural reason: the cost of a text change rises by two orders of magnitude as it passes through extraction, translation, integration, recording and LQA. A string changed in month four costs a keystroke. The same string changed in month twenty costs a re-extraction, a translation batch in fourteen languages, a re-record with a booked actor at minimum session cost, an integration, and an LQA pass in every language.

The pipeline runs in this order and each stage has a hard prerequisite on the one before. All display text lives behind a key-based lookup, never as a literal in code or in a widget property. Extraction gathers keys and source text into a translation package. Translators receive not just strings but context. Translations return and are integrated, ideally automatically, into localised string tables. Fonts and layout are validated per language. Voice is recorded against a locked script. LQA plays the game in each language and files context-dependent defects that no string-level check can catch.

Context is the stage most often skipped and it directly determines translation quality. A translator receiving the string `Fire` cannot know whether it is a verb on a button, a noun for the element, or an instruction to dismiss an employee, and the three translate differently in most languages. Supply per key: a description of use, the speaker and addressee for dialogue, grammatical role, a maximum character count derived from the UI, a screenshot or a reference to the screen, and a flag for strings that must not be translated. Studio: make context a required field at extraction time so a string without it fails the extract, which is the only mechanism that reliably produces it.

Text expansion is measurable and must be designed for rather than discovered. Against English source, German runs +30–40%, Russian +30%, French and Spanish +15–25%, Portuguese +20%, and short UI strings expand worse than long prose because there is less room to average out. CJK contracts in character count to roughly 50–70% of the width but requires larger glyph heights for legibility and cannot be hyphenated or broken arbitrarily. Design UI to accommodate +40% from the first layout and validate continuously with pseudo-localisation — an automatically generated fake locale that expands strings by 40%, adds accents to expose non-Unicode-safe paths, and brackets each string so truncation and concatenation are visible at a glance. Running pseudo-localisation in a nightly automated screenshot pass catches layout breakage months before real translations exist.

Script complexity is a technology decision, not a content one. CJK fonts are 5–20 MB each and cannot be subset naively if user-generated names are displayed. Arabic and Hebrew need right-to-left layout with mirrored UI and contextual glyph shaping. Thai has no word spacing and needs dictionary-based line breaking. Indic scripts need complex shaping with reordering. If any of those languages is plausible, the text stack must be shaping-capable (a HarfBuzz-based path) from the start, because retrofitting shaping into a bitmap-font UI system is a rewrite.

Voice is the long pole. Casting, direction and studio booking are 12–20 weeks of lead time for a full cast; a AAA script runs 5,000–30,000 lines for the source language, and every localised VO language multiplies recording, direction and integration. A line changed after recording requires the same actor, a minimum session charge, and a matched acoustic environment; a line changed after the actor is unavailable requires a rewrite. This is the mechanism behind script lock, and script lock is worth enforcing even when it feels premature.

Budget shape for planning: text-only localisation runs roughly £0.08–0.20 per word per language depending on language and vendor, a AAA script is 100k–500k words including barks and UI, and the standard shipping set is 10–14 languages. LQA is 2–6 weeks per language on a playable build with a working language switch and a content-jump debug facility — provide both, because without them LQA burns its budget replaying content to reach the string it needs to check.

| Language | Text expansion versus English | Notes |
|---|---|---|
| German | +30–40% | The worst common case; design UI to survive it |
| Russian | +25–35% | Cyrillic plus long compounds |
| French, Spanish, Portuguese, Italian | +15–25% | Consistent moderate expansion |
| Polish, Turkish | +20–30% | Inflection produces long forms |
| Japanese, Chinese | −30–50% character count | Needs larger glyph height; no arbitrary line breaking |
| Korean | −10–20% | Word-boundary breaking rules |
| Arabic | Variable | Right-to-left, contextual shaping, mirrored layout |

LQA is played, not proofread. A linguistic tester runs the game in the target language looking for truncation, overflow, wrong register, wrong gender agreement, mistranslated context, unlocalised assets and audio that does not match its subtitle — categories that no string-level review can catch because they only exist in situ. Give LQA a build with a runtime language switch, a content-jump facility and a subtitle debug overlay showing string keys, and the pass costs 2–6 weeks per language; withhold those and the same pass costs twice as long and finds less.

## Pass conditions

Answer yes to every applicable line before the project is considered correctly set up.

1. A full internal certification pass runs at alpha and at every subsequent milestone, owned by a named person with access to the platform requirement documents.
2. Suspend/resume, controller disconnect, user sign-out, save corruption, storage full and network loss each have an explicit test case executed on hardware.
3. Two certification submissions are budgeted in the schedule as the plan, with the release candidate submitted 6–8 weeks before the launch date.
4. Age ratings, store metadata and territory configuration have owners and dates in the schedule, not just the build.
5. No display string is a literal in code or in a widget property; a linter enforces this.
6. Context, character limit and speaker are mandatory fields at string extraction, and an extraction lacking them fails.
7. Pseudo-localisation runs in a nightly automated screenshot pass from the first UI milestone, and layouts accommodate +40% text expansion.
8. The text stack supports complex shaping and right-to-left layout if any such language is plausible, decided before the UI system is built.
9. Script lock precedes voice recording, and the cost of a post-recording line change is understood by whoever approves script changes.
