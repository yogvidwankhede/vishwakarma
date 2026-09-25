// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * The characteristic failure of generated interface work is not ugliness. It is a site that
 * is beautiful and unfinished.
 *
 * The spacing is right, the type scale is right, the motion is tasteful — and the footer
 * links 404, the testimonials are invented, the "Watch demo" button goes nowhere, and the
 * hero describes a product that does not exist. Every other skill in this catalogue asks
 * whether the artefact looks and behaves well. None of them asks whether it is a real,
 * launchable, honest artefact, which is why an agent can satisfy all of them and still hand
 * back something nobody can put their name on.
 *
 * This skill draws one line through the middle of that gap: the difference between what is
 * real, what is admittedly a placeholder, and what is fabricated. The first two are ordinary
 * unfinished work. The third is a claim about the world published under someone else's name,
 * and the reason an omission is always safer than an invention is that an omission is visible
 * to the owner and an invention is not.
 */
export const shipReadiness: SkillManifest = {
  vsm: '1.0',
  id: 'ship-readiness',
  name: 'Ship Readiness',
  description:
    'Use before calling a site finished, to check it is launchable and honest: real content, live links, legal surfaces, nothing fabricated.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'workflow',
  tags: ['shipping', 'launch', 'honesty', 'placeholders', 'legal-surfaces', 'handoff', 'trust'],

  activation: {
    intents: [
      'the user says the generated output is not end to end and not finished',
      'the user asks whether a site that looks designed can actually be launched',
      'generating a landing page, marketing site, or product page from a brief',
      'the page shows testimonials, customer logos, star ratings, or user counts',
      'the user asks for social proof and has supplied no real quotes or customers',
      'a hero section claims a product that has not been built or cannot be demonstrated',
      'the user asks whether the site needs a privacy policy, terms, or a cookie banner',
      'the page has just gained a signup form, an email capture, or an analytics script',
      'the user reports that footer links 404 or that buttons do nothing',
      'the user asks for a pre-launch, go-live, or production-readiness checklist',
      'replacing placeholder content with real content before handing a site over',
      'deciding whether an agent may write legal, pricing, security, or compliance copy',
      'reporting a generated site as complete and handing it back to its owner',
    ],
    globs: [
      '**/app/**/page.{ts,tsx,js,jsx}',
      '**/pages/**/*.{ts,tsx,js,jsx}',
      '**/*.html',
      '**/{Footer,Hero,Testimonials,Reviews,Logos,Pricing,Contact}*.{ts,tsx,jsx,vue,svelte}',
      '**/{privacy,terms,legal,cookies}/**',
      '**/not-found.{ts,tsx,js,jsx}',
      '**/{404,500}.{html,tsx,jsx}',
      '**/robots.{txt,ts,js}',
      '**/public/**/{favicon,apple-touch-icon,og-image}*',
    ],
    keywords: [
      'ship it',
      'go live',
      'launch checklist',
      'pre-launch',
      'production ready',
      'end to end',
      'finished',
      'testimonials',
      'social proof',
      'fake reviews',
      'placeholder',
      'lorem ipsum',
      'privacy policy',
      'terms of service',
      'cookie banner',
      '404 page',
      'favicon',
      'dead link',
      'watch demo',
      'handoff',
    ],
  },

  content: {
    summary:
      'Judge whether an artefact can actually be launched: partition every element into real, placeholder, and fabricated; remove invented proof; resolve every link and form; ship error pages and site furniture; hand legal, pricing, and claims to a human.',

    body: `# Ship Readiness

Generated interface work fails in a specific way: it is **beautiful and unfinished**. Spacing,
type scale and motion are right, and the footer links 404, the testimonials are invented, the
"Watch demo" button goes nowhere, and the hero describes a product nobody can see. Every other
skill here asks whether the artefact looks and behaves well. This one asks whether it is a real,
launchable, honest artefact — a thing the owner can put their name on in public today and defend
line by line.

---

## 1. Real, placeholder, fabricated

Partition every visible element into three buckets before anything else.

**Real** — backed by something that exists: a route that resolves, a quote someone said, a
screenshot of a build. **Placeholder** — visibly and admittedly a stand-in, marked so the owner
trips over it. **Fabricated** — presented as real and is not.

The first two are ordinary unfinished work. The third is a different kind of object, and the
asymmetry is the whole mechanism: **a placeholder is discovered by the owner, a fabrication is
discovered by the reader.** Nothing in the markup distinguishes an invented number from a
measured one, so the invention survives every review the owner performs by looking at the page.

---

## 2. Invented social proof is not a design decision

Testimonials, faces, company logos, star ratings, review counts, "trusted by", press mentions,
awards, user and revenue numbers. Generating any of these fabricates a claim about third parties
and publishes it under the owner's name. A false endorsement or invented review is commonly
unlawful rather than merely tacky — the specifics vary by jurisdiction and belong to the owner's
counsel — and the liability lands on the owner, who never saw the sentence being written.

**An honest empty state beats a fabricated one.** Either delete the section, or render it as a
labelled slot with two or three real items' worth of structure and a note in the handback list
naming exactly what the owner must supply. A page with no testimonial band reads as early. A page
with invented ones, once noticed, retroactively discredits the claims that were true.

---

## 3. A demo is a thing that runs

Rank the options honestly, strongest first: the working product embedded; a recording of the real
product; annotated screenshots of a real build; a mock **explicitly labelled** as a concept. A
static mock presented as the product is in bucket three.

Any "See it", "Watch demo" or "Try it" affordance must open something. The hero is the only moment
of attention the page gets; a control that spends it and delivers nothing is stronger evidence
that the product does not exist than saying nothing would have been.

---

## 4. Nothing dead, nothing fake

- **Links.** Every internal route exists, every anchor has a target, every external URL resolves.
  Generated link rot is systematic, not random — the nav and footer are written from the sitemap
  in the brief, before the pages are made — so spot-checking three links misses the pattern.
- **Forms.** Every form posts to a real endpoint and renders both outcomes. A form that discards
  silently is worse than no form: the visitor believes they made contact, and the owner loses a
  lead without learning one existed.
- **Buttons.** \`href="#"\`, an empty \`onClick\`, an \`alert()\`, a submit handler that only logs:
  each is a promise the visitor pays to discover is broken, after committing intent.
- **Content.** No lorem ipsum, no "Jane Doe", no grey avatar rings, no \`example.com\`, no 555
  numbers, no stock photography standing in for a product, no \`TODO\`. Placeholder prose signals
  abandonment more loudly than an unfinished layout does.

---

## 5. The furniture nobody generates

Favicon at every required size, a distinct \`<title>\` per route, a meta description, a share image
that renders at 1200x630, \`theme-color\`, and **404 and 500 as designed pages** on the site's own
layout with a route back. The error pages matter disproportionately: a framework default breaks
the frame at the exact moment the visitor already suspects the site is broken, and the 404 is the
one page guaranteed to be reached by anyone following an old link.

Anything that fetches needs a loading state and an error state, because the generated version was
developed against fixtures that resolve in single-digit milliseconds and never saw a p95.

---

## 6. Legal surfaces scale with what the page does

State the trigger, not a blanket requirement. Obligations are commonly triggered by the
collection itself, so the trigger sits in the code just written.

- **Collects nothing** — no forms, no analytics, no cookies, no third-party embeds: no notice is
  required. Do not add one.
- **Sets a non-essential cookie, loads analytics, or embeds a third-party font, map, or player**
  that sees the visitor's IP: commonly triggers a privacy notice, and in several jurisdictions
  prior consent for the non-essential parts.
- **Accepts an email address or any personal data:** a privacy notice naming who controls the
  data, what is collected, why, how long it is kept, and how to reach a human.
- **Accounts, payments, or user-submitted content:** terms of service as well.

Which rules apply, and in what form, varies by jurisdiction and by who the visitors are. That
question is for the owner's counsel, not for this skill and not for the agent.

---

## 7. Hand back rather than invent

Do not write legal copy, pricing or billing terms, uptime or performance figures, security and
compliance statements, certification claims, customer names, or accessibility conformance
statements. These are the sentences a customer contract or a regulator holds the owner to, and in
the markup they are indistinguishable from decoration.

A missing privacy policy is a visible to-do. A generated one is an enforceable set of promises
nobody at the company made, and it destroys the only signal that counsel was never involved.
Where a link must exist, point it at a page that states plainly that the document is pending and
commits to nothing.

---

## 8. Finished is a claim with evidence

Close by reporting three lists — **real**, **placeholder**, **needs a human** — each item naming
its file and line, and each handback naming what is required and who must supply it. The artefact
was optimised to look finished, so inspection cannot separate finished from convincing. The
partition is what makes "done" falsifiable.

---

## Boundaries

\`interface-states\` owns the **design** of empty, loading and error states; this skill owns
whether they **exist** before shipping. \`seo-and-metadata\` owns whether metadata is **correct**;
this skill owns whether it is **present** in the ship checklist. \`interface-copy\` owns whether
the words are **good**; this skill owns whether they are **true**. This is not a legal skill: it
names what triggers a requirement and insists a human write or approve it.

Load \`pre-launch-checklist\` to run the gates in order, \`honest-substitutes\` when real content
does not exist yet, \`legal-surface-triggers\` when deciding what the page owes.`,

    references: [
      {
        id: 'pre-launch-checklist',
        title: 'The pre-launch checklist, in gate order, with the commands that check it',
        answers:
          'What exactly do I check before reporting a site finished, in what order, and which of those checks can I run rather than eyeball?',
        content: `# Pre-launch checklist

Run the gates in order. Each gate has a machine check where one exists and an eyeball check where
it does not. A gate that fails blocks the "finished" claim; it does not block progress on the
others, so run the whole sweep and report once.

Commands assume a POSIX shell at the project root and a build served locally at
\`http://localhost:3000\`. Adjust the port and the source directory; do not skip a gate because
its command did not fit the stack.

---

## Gate 1 — Fabrication sweep (blocking, always)

Nothing on the page claims something that is not true.

    grep -rniE "testimonial|review|rating|trusted by|as seen in|customers|awards" src/ \\
      --include="*.tsx" --include="*.jsx" --include="*.vue" --include="*.svelte" -l

For every file returned, answer per item: **who said this, and where did the number come from?**
Any item without an answer is fabricated and comes out. Then sweep the numeric claims, which hide
better than quotes do:

    grep -rnE "[0-9]+(,[0-9]{3})*\\+? (users|customers|teams|companies|downloads)" src/
    grep -rniE "99\\.9|uptime|SOC ?2|ISO ?27001|HIPAA|GDPR compliant|PCI" src/
    grep -rniE "[0-9]+x (faster|cheaper)|fastest|most secure|industry.leading" src/

Each hit is either owner-supplied, measured in this session with the method stated, or deleted.

---

## Gate 2 — Placeholder sweep (blocking)

    grep -rniE "lorem ipsum|dolor sit amet|jane doe|john doe|acme|example\\.com|\\
555-?[0-9]{4}|your company|company name|TODO|FIXME|placeholder|coming soon" src/ public/

Expect false positives in comments and fixtures; check whether each one reaches a visitor. Then
look for the visual placeholders grep cannot see: grey avatar circles, generic stock photography
standing in for the product, an icon set where two icons are obviously stand-ins.

---

## Gate 3 — Every link resolves (blocking)

Collect hrefs, then check them.

    grep -rhoE 'href="[^"]+"' src/ | sort -u

Internal: each path has a corresponding route file or static file. Anchors: each \`#id\` has an
element with that id **on the same page**. External: fetch them.

    grep -rhoE 'https?://[^" <)]+' src/ | tr -d "'" | sort -u | while read -r u; do
      code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$u")
      [ "$code" = "200" ] || echo "$code $u"
    done

Zero rows of output is the pass condition. Treat a 403 from a site that blocks bots as a manual
check, not a pass.

---

## Gate 4 — No dead controls (blocking)

    grep -rnE 'href="#"|href=""|onClick=\\{\\(\\) *=> *\\{ *\\}\\}|onSubmit=\\{\\(\\) *=> *\\{ *\\}\\}' src/
    grep -rnE 'alert\\(|console\\.log\\(' src/ --include="*.tsx" --include="*.jsx"

Every interactive element ends in one of three states: it does its thing, it is disabled with a
visible reason, or it is deleted. There is no fourth state.

For each form: name the endpoint, name the success rendering, name the failure rendering. A form
whose endpoint is "to be wired up later" is a placeholder and belongs in the handback list, not
in the shipped page.

---

## Gate 5 — Error pages and states (blocking)

    curl -s -o /dev/null -w "%{http_code}\\n" http://localhost:3000/definitely-not-a-real-path

Expect 404, and expect the response body to use the site's own layout with navigation and a route
back. Force a 500 from one route and look at it. Then, for every view that fetches: throttle the
network to a slow profile and reload — a view that flashes from blank to populated has no loading
state. Block the request and reload — a view that shows nothing has no error state. \`interface-states\`
governs what those states should look like; this gate only establishes that they exist.

---

## Gate 6 — Site furniture (blocking)

    ls public/ | grep -iE "favicon|apple-touch-icon|icon-|og-|opengraph"
    grep -rn "<title>\\|title:" src/app src/pages 2>/dev/null | head -40

Present and correct: favicon, apple-touch-icon, a distinct title per route, a meta description,
\`theme-color\`, and a share image that actually renders at 1200x630 — open the image file and look
at it, because a 1200x630 canvas with 14px text is technically present and useless. Confirm
\`robots.txt\` does not disallow the whole site, a leftover of many staging deployments.
\`seo-and-metadata\` governs correctness; this gate establishes presence.

---

## Gate 7 — Legal surfaces, by trigger (blocking when triggered)

Determine what the page actually does before deciding what it owes.

    grep -rniE "gtag|googletagmanager|analytics|posthog|mixpanel|hotjar|clarity|segment|\\
plausible|fathom|fbq|pixel" src/ public/
    grep -rniE "document\\.cookie|localStorage|sessionStorage|setCookie" src/
    grep -rnE '<iframe|src="https://(fonts|maps|www\\.youtube|player\\.vimeo)' src/
    grep -rniE 'type="email"|name="email"|<form' src/

No hits in any of the four and no forms: no notice is required, and adding one invents a
relationship that does not exist. Hits in the first three: a privacy notice, and consent for the
non-essential parts in several jurisdictions. Hits in the fourth: a privacy notice naming
controller, data, purpose, retention and a contact route. Accounts, payments or user content:
terms as well. Then confirm every legal link in the footer resolves — a 404 on \`/privacy\` is
worse than no link, because it asserts a document exists.

**The agent does not write any of these documents.** Name the requirement, name the trigger you
found and its file, hand it over.

---

## Gate 8 — The completion report (blocking, always)

Three lists, no prose summary in place of them.

    ## Real
    - Pricing table — 3 tiers, figures from brief section 4 — src/components/Pricing.tsx:12
    - Product screenshots — captured from the running build at /app — public/shots/*.png

    ## Placeholder (visible, marked, safe to ship or not)
    - Team photos — generic silhouettes, marked "replace" — src/components/Team.tsx:28
      Safe to ship: no. Reads as a real team of four.
    - Blog index — three posts of real copy, no further posts — src/app/blog/page.tsx

    ## Needs a human
    - Privacy policy — triggered by the Plausible script (src/app/layout.tsx:19) and the
      newsletter form (src/components/Signup.tsx:8). Counsel or the owner must write it.
      Footer link currently points at /privacy, which returns a pending-document page.
    - Testimonials — section removed. Supply 3 quotes with name, role, company, and
      permission to publish; slot markup kept at src/components/Social.tsx:1.
    - Uptime claim "99.9%" — removed from the hero. Reinstate only with a measurement or an SLA.

If the "Needs a human" list is empty on a first generation of a commercial site, the sweep was
not run properly. That list is almost never empty, and its emptiness is a stronger signal of a
missed gate than of a complete site.`,
      },
      {
        id: 'honest-substitutes',
        title: 'What to render instead, when the real thing does not exist yet',
        answers:
          'The owner has no testimonials, no customers, no built product, no real metrics — what do I put on the page instead of inventing them?',
        content: `# Honest substitutes

Every fabrication exists because a layout has a slot and the slot has nothing to put in it. The
answer is never to fill the slot with an invention, and it is rarely to leave a visibly broken
gap. It is to change what the slot is for, so the page is honest at full strength rather than
dishonest at full strength or honest at half.

The test for every substitute below: **a stranger reading the page forms no belief that is
false.** Not "technically defensible" — no belief that is false.

---

## Social proof with no customers

**Do not** invent quotes, generate faces, place logos of companies that are not customers, or
render star ratings and review counts.

**Instead**, pick whichever of these is true:

- **Cut the band entirely.** An early product with a clear value proposition and no testimonial
  section reads as early. That is accurate, and accuracy is a positioning choice a founder is
  allowed to make.
- **Substitute a different kind of evidence that is real.** A screenshot of the product doing the
  thing. A worked example with real numbers. A published changelog. An open-source repository and
  its star count. A named founder with a real bio and a reachable address. Each of these does the
  job a testimonial does — reducing the reader's risk — without a claim about a third party.
- **Say what stage it is.** "Currently in private beta with eight teams" is social proof if it is
  true, and it is a sentence the owner can confirm or correct in one word. Put it in the handback
  list as a claim awaiting confirmation rather than shipping it unconfirmed.
- **Keep the slot, remove the content.** Leave the markup, the spacing and the responsive
  behaviour in place behind a flag or a comment block that states exactly what is required: three
  quotes, each with name, role, company, and permission to publish. The owner then fills a form,
  not a design problem.

A fabricated testimonial removed from the page costs one section. A fabricated testimonial noticed
by a reader costs every other claim on the page, because the reader now has no way to tell which
of them were also generated.

---

## A hero for a product nobody can see

Rank by how much the visitor can verify:

1. **The product itself, embedded or linked.** A live sandbox, a public URL, a playable state.
2. **A recording of the real product.** A 20-second screen capture beats a polished animation of
   an interface that does not exist, because the capture cannot be made without the thing.
3. **Annotated screenshots of a real build.** Real pixels, real data shapes, callouts explaining
   what is on screen.
4. **A concept mock, labelled as one.** "Concept — the product is in development" in text a
   visitor will actually read, not 11px grey under the fold.

Everything above the line is evidence. Number four is honest intent. A number four with the label
removed is a fabrication, and the label is the only thing separating them.

**When there is nothing to show,** change the page's job. A waitlist page that says what is being
built, who it is for, and when it will be ready needs no demo: it promises nothing visible and
therefore misleads nobody. Announce the constraint instead of papering over it, and tell the owner
plainly that the page currently sells a promise.

**A "Watch demo" button with no demo** gets deleted, not disabled. A disabled primary CTA still
asserts that a demo exists and is temporarily unavailable.

---

## Numbers that were never measured

Uptime, latency, throughput, conversion lift, time saved, users, revenue, growth rate,
certifications. Three legitimate sources, and no fourth:

- **Owner-supplied**, recorded as such in the handback list so it is traceable later.
- **Measured in this session**, published with the method and conditions in the same breath — "1.2s
  first load on a throttled 4G profile, cold cache, Moto G4 class device" — because a number
  without conditions is a different claim from the one that was measured.
- **Cited to a public source** that the visitor can follow, with the link on the page.

Where none of the three applies, write the mechanism instead of the magnitude. "Deploys run on
every push, so a fix reaches production in one step" makes a checkable structural claim. "10x
faster deploys" makes an unfalsifiable numeric one, and it is the numeric one a regulator or a
disappointed customer quotes back.

---

## Content slots with no content

- **Body copy.** Write the shortest true version, not filler to the length of the mock. A card
  with one accurate sentence is finished; the same card with three sentences of invented detail
  about a feature set nobody specified is a fabrication with good rhythm.
- **People.** No generated faces, no stock portraits presented as staff. Initials in a coloured
  circle, or no team section.
- **Logos and brand marks.** A wordmark in the site's own type is honest. A generated logo the
  owner has not seen is a brand decision an agent is making silently; flag it as provisional.
- **Blog and changelog indexes.** Three real entries beat twelve invented ones. An empty index
  with a line explaining what will appear is better than either.
- **Contact details.** No invented addresses, phone numbers or support emails. A form that posts
  somewhere real, or the owner's actual address, or nothing.
- **Case studies and metrics dashboards.** If the data is sample data, label it sample data
  **inside the component**, where a reader sees it, not only in a code comment.

---

## The framing that makes this easy to accept

An agent that omits is easy to correct: the owner sees the gap, fills it, and ships. An agent that
invents produces an artefact that looks finished and is a liability, and the person who discovers
the difference is a customer, a journalist, or a regulator rather than the owner.

So the default is always the same. **Omit, mark, and hand back.** A site that is visibly 90 per
cent done is a working relationship. A site that is invisibly 70 per cent fabricated is a problem
with the owner's name on it.`,
      },
      {
        id: 'legal-surface-triggers',
        title: 'Which legal and consent surfaces a page owes, keyed to what it actually does',
        answers:
          'This page has a form, an analytics tag, and an embedded video — what documents and consent surfaces does it now owe, and what exactly do I hand to a human?',
        content: `# Legal surface triggers

This reference maps **what the page technically does** to **what it therefore owes**, so the
decision is read off the code rather than guessed from the page's genre. It does not state the
requirements of any named statute, and it is not legal advice. Which rules apply, how they apply,
and what the documents must say vary by jurisdiction, by where the visitors are, and by what the
business does. Those questions belong to the owner's counsel.

What an agent can do reliably is detect the trigger and refuse to write the document.

---

## The trigger table

| What the page does | What it commonly owes |
| --- | --- |
| Static content, no forms, no cookies, no analytics, no third-party requests | Nothing. Do not add a policy. |
| Sets a cookie or writes to \`localStorage\` for non-essential purposes | Privacy notice; in several jurisdictions, prior consent for the non-essential parts |
| Loads analytics, a session recorder, a heat-mapper, or an ad pixel | Privacy notice covering it by name; consent where the jurisdiction requires it |
| Embeds a third-party font, map, video player, or widget | Disclosure that a third party receives the visitor's IP and request data |
| Collects an email address or any personal data | Privacy notice: who controls the data, what is collected, why, retention, contact route |
| Offers accounts, payment, or user-submitted content | Terms of service in addition to the privacy notice |
| Sends marketing email | A lawful basis or consent mechanism, and an unsubscribe route that works |
| Serves children, health, financial, or biometric data | Additional regimes apply. Stop and escalate; do not reason about these from first principles. |

Two properties of this table matter more than its rows. First, **the trigger is in the code you
just wrote** — an agent that adds an analytics snippet has created the obligation in the same edit,
which is why the check belongs in the ship sweep and not in a later review. Second, **the
obligations are cumulative**: a page with a signup form, a pixel and an embedded player owes the
union of three rows, not the most demanding one.

---

## Detecting each trigger

    # analytics, pixels, session recording
    grep -rniE "gtag|googletagmanager|google-analytics|posthog|mixpanel|amplitude|\\
segment|hotjar|clarity|fullstory|fbq|facebook\\.net|linkedin\\.com/px" src/ public/

    # client-side storage
    grep -rniE "document\\.cookie|localStorage|sessionStorage|js-cookie|setCookie" src/

    # third-party embeds that observe the visitor
    grep -rnE '<iframe|<script src="https://|href="https://fonts\\.googleapis' src/

    # personal data intake
    grep -rniE '<form|type="email"|type="tel"|name="(email|phone|name|address)"' src/

    # payment
    grep -rniE "stripe|paddle|lemonsqueezy|paypal|checkout" src/

Report each hit with its file and line in the handback list. The file and line are what let the
owner's counsel answer the question in minutes instead of reading the site.

---

## Consent surfaces, if one is required

An agent may build the **mechanism** and must not write the **text**. A mechanism that is
technically correct:

- **Nothing non-essential fires before a choice is made.** A banner that appears while the
  analytics script has already loaded and set its cookie is decoration; it records a decision that
  was already taken. This is the single most common implementation error, and it is verifiable:
  load the page with the network tab open and confirm no non-essential request precedes the choice.
- **Refusal is as easy as acceptance** — same level, same prominence, one interaction. An "Accept
  all" button beside a "Manage preferences" link is not symmetrical.
- **The choice persists and is revocable** from a durable place, usually a footer link, so a
  visitor can change it after the banner is gone.
- **Essential and non-essential are separated**, and the categories describe what the scripts
  actually do rather than a generic three-tier list copied from another site.

Verify the first property by measurement, not by reading the code. Tag managers commonly load
their own dependencies in an order the source does not show.

---

## What the agent writes, and what it never writes

**Writes:** the trigger report, the route and the page shell, the footer link, the consent
mechanism, the retention behaviour the code actually implements, and a plain sentence on any
pending page stating that the document is not yet written and commits to nothing.

**Never writes, adapts, fills in, or copies from another site:** privacy policies, terms of
service, cookie notices, data processing terms, subprocessor lists, refund and cancellation terms,
SLAs, security or compliance statements, certification claims, accessibility conformance
statements, or any pricing that becomes an offer.

The mechanism is the visibility asymmetry. A missing privacy policy is a to-do the owner sees on
the first walkthrough. A generated one is a document that reads correctly, appears complete,
binds the owner to promises nobody at the company made — retention periods the systems do not
honour, subprocessors that are not used, rights procedures nobody staffs — and removes the only
signal that counsel was never involved. **The omission is loud and the invention is silent, which
is why the omission is the safe failure.**

---

## The handback entry

One entry per triggered document. Enough that a non-technical owner can act on it without reading
the codebase.

    ### Privacy notice — required, not written
    Triggered by:
      - Plausible analytics script — src/app/layout.tsx:19
      - Newsletter form collecting email — src/components/Signup.tsx:8
      - Embedded YouTube player on /product — src/app/product/page.tsx:64
    Who must act: the owner, or counsel if visitors are outside the home jurisdiction.
    Current state: /privacy returns 200 with a page stating the document is pending.
    Blocking launch: yes, while the analytics script and the form are live.
    Not done by the agent: the text of the notice. Requesting it is the whole action.

    ### Consent mechanism — built, unconfigured
    Non-essential scripts are gated and do not fire before a choice. Categories and copy
    are placeholders and must be replaced by the owner. Revocation link present in footer.

An owner who reads that knows what to do. An owner handed a generated policy does not know there
is anything to do, which is the outcome this reference exists to prevent.`,
      },
    ],
  },

  rules: [
    {
      id: 'ship/no-fabricated-social-proof',
      strength: 'must-not',
      statement:
        'Do not generate testimonials, quotes, customer names, company logos, star ratings, review counts, press mentions, or user and revenue figures that the owner has not supplied.',
      evidence: {
        rationale:
          'These are factual claims about third parties published under the owner’s name, and nothing in the markup distinguishes an invented quote from a real one — so the owner cannot catch it by looking at the page, and the first person to detect it is a customer, a journalist, or a regulator. Inventing an endorsement or a review is commonly unlawful rather than merely tacky, and the liability falls on the owner rather than on whatever generated the sentence.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: '"Vishwakarma cut our release cycle in half." — Sarah Chen, VP Engineering, Northwind Logistics. Plus four greyscale company logos under "Trusted by".',
        good: 'Testimonial band removed. Handback: "Supply 3 quotes with name, role, company and permission to publish; slot markup kept at src/components/Social.tsx:1."',
      },
      exceptions: [
        'Clearly labelled sample data in an internal demo, a design file, or a component gallery that no public visitor reaches, where the label is inside the rendered component rather than only in a code comment.',
      ],
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/empty-over-invented',
      strength: 'should',
      statement:
        'Where real proof does not exist yet, omit the section or render it as a visibly labelled slot naming what the owner must supply, rather than filling it.',
      evidence: {
        rationale:
          'The costs are asymmetric by an order of magnitude. A missing testimonial band costs a little credibility and reads as early-stage, which is accurate. A fabricated one, once noticed, retroactively discredits every other claim on the page — including the true ones — because the reader now has no way to tell which were generated.',
        confidence: 'strong',
      },
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/demo-shows-a-real-artefact',
      strength: 'must',
      statement:
        'Every "watch demo", "see it", or "try it" affordance must open the running product, a recording of it, a screenshot of a real build, or a mock labelled as a concept in copy a visitor will read.',
      evidence: {
        rationale:
          'The hero is the one moment of attention the page reliably gets, and a control that consumes it and delivers nothing is stronger evidence that the product does not exist than silence would have been. A recording or screenshot also cannot be produced without the artefact, which is why it functions as evidence and a rendered mock does not.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'A polished static mock of a dashboard in the hero, with a "Watch demo" button wired to href="#".',
        good: 'A 20-second screen capture of the real build, or the same mock with "Concept — product in development" set in body copy beside it and the demo button removed.',
      },
      exceptions: [
        'A waitlist or announcement page that promises nothing visible and says so in the page itself, where the page’s job is the promise rather than the product.',
      ],
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/no-dead-controls',
      strength: 'must-not',
      statement:
        'Do not ship an interactive control with no destination or handler — `href="#"`, an empty `onClick`, an `alert()`, or a submit that only logs; make it work, disable it with a visible reason, or delete it.',
      evidence: {
        rationale:
          'A control is a promise, and the visitor pays the cost of discovering it is broken only after committing intent — the most expensive possible moment, because that is the point at which they were willing to act. A disabled control with a stated reason is honest about the same absence; an enabled one that does nothing asserts capability the artefact lacks.',
        confidence: 'established',
      },
      exceptions: [
        'Throwaway prototypes built to show a layout, and internal demos, where the audience is told which controls are inert before they touch them.',
      ],
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/every-link-resolves',
      strength: 'must',
      statement:
        'Verify that every internal route exists, every anchor has a target on its own page, and every external URL returns 200, before reporting the site complete.',
      evidence: {
        rationale:
          'Link rot in generated output is systematic rather than random: the nav and footer are written from the sitemap in the brief before the pages behind them are made, so the broken links cluster in exactly the places a spot check treats as representative. Checking three links therefore gives almost no information about the remaining forty.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Footer ships with About, Careers, Blog, Changelog, Docs, Privacy, Terms. Two of those routes exist.',
        good: 'Collect every href, resolve each against the route tree, curl the external ones, and either build the missing pages or remove the links. Zero unresolved rows is the pass condition.',
      },
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/forms-have-a-destination',
      strength: 'must',
      statement:
        'Every form posts to a real endpoint and renders both a success result and a failure result, or it is removed from the page.',
      evidence: {
        rationale:
          'A form that discards silently is worse than no form at all: the visitor believes contact was made and stops trying, while the owner loses a lead without ever learning one arrived, so the failure is invisible on both sides and self-concealing. A visible failure state is what converts a lost submission into a retry.',
        confidence: 'established',
      },
      exceptions: [
        'A form whose endpoint is genuinely pending may ship behind an explicit "not yet accepting submissions" state, which is a different claim from a working form.',
      ],
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/no-placeholder-content',
      strength: 'must-not',
      statement:
        'Do not ship lorem ipsum, `example.com`, 555 numbers, "Jane Doe", generic avatar rings, stock photography standing in for the product, or `TODO` markers on any visitor-visible surface.',
      evidence: {
        rationale:
          'Placeholder text signals abandonment more strongly than an unfinished layout does, because a rough layout reads as a work in progress while Latin filler reads as a page nobody checked. It also transfers the discovery to the visitor: the owner scanning a designed page skims filler as texture, and the reader does not.',
        confidence: 'strong',
      },
      exceptions: [
        'Fixtures, storybook entries, test data, and internal component galleries, none of which a visitor reaches.',
      ],
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/designed-error-pages',
      strength: 'must',
      statement:
        'Ship 404 and 500 as designed pages using the site’s own layout, navigation, and a route back, rather than the framework defaults.',
      evidence: {
        rationale:
          'A framework default breaks the visual frame at the exact moment the visitor already suspects the site is broken, converting a recoverable wrong turn into a judgement about the whole artefact. The 404 is also the one page guaranteed to be reached, since every stale link, typo, and old search result lands there.',
        confidence: 'strong',
      },
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/loading-and-error-states-exist',
      strength: 'must',
      statement:
        'Confirm by throttling and by blocking the request that every view which fetches data has a loading state and an error state before shipping it.',
      evidence: {
        rationale:
          'The generated version is developed against local fixtures that resolve in single-digit milliseconds, so a missing state is invisible in every environment the author saw and becomes the default experience on a real network. Throttling and blocking are the only checks that make the absence observable, because reading the code shows the states that were written, not the ones that were not.',
        confidence: 'established',
      },
      exceptions: [
        'Views whose data is embedded at build time and never fetched at runtime, which cannot occupy either state.',
      ],
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/site-furniture-present',
      strength: 'must',
      statement:
        'Ship a favicon, a distinct `<title>` per route, a meta description, and a share image that renders legibly at 1200x630, and confirm `robots.txt` does not disallow the whole site.',
      evidence: {
        rationale:
          'These render outside the page, in tabs, bookmarks, search results and pasted links, where the design work is not present to compensate — so a default globe icon and a framework-generated title are the entire first impression in the contexts a site is most often encountered. A staging `robots.txt` carried into production makes the site invisible while every on-page check still passes.',
        confidence: 'established',
      },
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/privacy-surface-when-collecting',
      strength: 'must',
      statement:
        'Where the page accepts personal data, sets non-essential cookies, loads analytics, or embeds third parties that observe the visitor, ensure a privacy notice exists and is linked, and treat its absence as blocking launch.',
      evidence: {
        rationale:
          'The obligation is triggered by the collection itself, which means it is created by the edit that added the script or the form — so the trigger is detectable in the code the agent just wrote rather than inferable from the page’s genre. Which rules apply and what the notice must say vary by jurisdiction and by where the visitors are, and those specifics are for the owner’s counsel.',
        confidence: 'strong',
      },
      exceptions: [
        'A static page with no forms, no cookies, no client-side storage, no analytics, and no third-party requests owes no notice, and adding one asserts a data relationship that does not exist.',
      ],
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/never-draft-legal-text',
      strength: 'must-not',
      statement:
        'Never write, adapt, or copy the text of a privacy policy, terms of service, cookie notice, or any other document the owner would be legally bound by — name the document, name its trigger, hand it to a human.',
      evidence: {
        rationale:
          'The visibility asymmetry decides it: a missing policy is a to-do the owner meets on the first walkthrough, while a generated one reads correctly, appears complete, and binds the owner to promises nobody at the company made — retention periods the systems do not honour, subprocessors that are not used, rights procedures nobody staffs. It also removes the only remaining signal that counsel was never involved.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Generate a standard privacy policy with 30-day log retention, a named DPO, and a subprocessor list, so the footer link resolves.',
        good: 'Footer links to /privacy, which returns 200 with a page stating the document is pending and committing to nothing. Handback names the two triggers with file and line, and asks the owner or counsel for the text.',
      },
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/no-unverified-claims',
      strength: 'must-not',
      statement:
        'Do not publish uptime, latency, throughput, savings, growth, security posture, certification, or customer-count claims unless the owner supplied them or you measured them in this session and stated the method and conditions.',
      evidence: {
        rationale:
          'These are the sentences a customer contract, a procurement questionnaire, or a regulator quotes back to the owner, and in the markup they are indistinguishable from decorative copy — so they pass a design review unexamined. A number without its conditions is also a different claim from the one that was measured, which makes an unconditioned figure unfalsifiable rather than merely imprecise.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: '"99.99% uptime. SOC 2 compliant. 10,000+ teams ship faster with us."',
        good: '"1.2s first load on a throttled 4G profile, cold cache, Moto G4 class device." Everything else moved to the handback list as an owner-supplied claim.',
      },
      verifiedBy: 'ship-readiness-review',
    },
    {
      id: 'ship/completion-report-partitions',
      strength: 'must',
      statement:
        'Report completion as three explicit lists — real, placeholder, and needs a human — with each item naming its file and line and each handback naming who must supply what.',
      evidence: {
        rationale:
          'The artefact was optimised to look finished, so inspecting it cannot separate finished from convincing; the partition is the only thing that makes "done" falsifiable. Naming the file and line also moves the handback from a judgement the owner must re-derive to an action they can take, which is the difference between a list that gets worked and one that gets filed.',
        confidence: 'strong',
      },
      exceptions: [
        'A change small enough that the whole diff is the report — a copy fix, a single component — where a partition would be longer than the work.',
      ],
      verifiedBy: 'ship-readiness-review',
    },
  ],

  verification: [
    {
      id: 'ship-readiness-review',
      kind: 'self-review',
      description:
        'Confirm the artefact is launchable and honest: nothing fabricated, nothing dead, the required surfaces present, and the handback list explicit.',
      blocking: true,
      questions: [
        'For every testimonial, logo, rating, review count, award, and user or revenue figure on the page: who said it, or where did the number come from? Anything without an answer must be removed before you report done.',
        'Does every "watch demo", "see it", or "try it" control open something a visitor can actually watch or use, and is any mock that is not the real product labelled as a concept in copy a visitor will read?',
        'Did you resolve every internal route, every anchor target, and every external URL — not a sample — and does every form post to a real endpoint with both a success and a failure rendering?',
        'Is there any control left that does nothing: `href="#"`, an empty handler, an `alert()`, a submit that only logs? Each one must now work, be disabled with a visible reason, or be gone.',
        'Did you grep the visitor-visible surfaces for lorem ipsum, `example.com`, 555 numbers, placeholder names, stock stand-ins, and `TODO`, and clear every hit that a visitor reaches?',
        'Do 404 and 500 render as designed pages on the site’s own layout, and did you confirm by throttling and by blocking a request that every fetching view has a loading state and an error state?',
        'Are the favicon, per-route titles, meta descriptions, and a share image that is legible at 1200x630 all present, and does `robots.txt` allow the site?',
        'Which of these does the page actually do — accept personal data, set non-essential cookies, load analytics, embed a third party that sees the visitor’s IP — and for each one, does the required notice exist, is it linked, and does that link resolve?',
        'Did you write, adapt, or copy any legal, pricing, compliance, security, or performance text? If so, remove it and hand the requirement back with its trigger named by file and line.',
        'Does your report partition the work into real, placeholder, and needs-a-human, with file and line for each item, rather than asserting that the site is finished?',
      ],
    },
  ],

  relatedSkills: [
    'interface-states',
    'seo-and-metadata',
    'interface-copy',
    'ui-generation-workflow',
    'engineering-discipline',
  ],
}
