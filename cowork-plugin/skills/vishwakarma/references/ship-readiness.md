# Ship Readiness

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
- **Buttons.** `href="#"`, an empty `onClick`, an `alert()`, a submit handler that only logs:
  each is a promise the visitor pays to discover is broken, after committing intent.
- **Content.** No lorem ipsum, no "Jane Doe", no grey avatar rings, no `example.com`, no 555
  numbers, no stock photography standing in for a product, no `TODO`. Placeholder prose signals
  abandonment more loudly than an unfinished layout does.

---

## 5. The furniture nobody generates

Favicon at every required size, a distinct `<title>` per route, a meta description, a share image
that renders at 1200x630, `theme-color`, and **404 and 500 as designed pages** on the site's own
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

`interface-states` owns the **design** of empty, loading and error states; this skill owns
whether they **exist** before shipping. `seo-and-metadata` owns whether metadata is **correct**;
this skill owns whether it is **present** in the ship checklist. `interface-copy` owns whether
the words are **good**; this skill owns whether they are **true**. This is not a legal skill: it
names what triggers a requirement and insists a human write or approve it.

Load `pre-launch-checklist` to run the gates in order, `honest-substitutes` when real content
does not exist yet, `legal-surface-triggers` when deciding what the page owes.

## Rules

### MUST NOT — Do not generate testimonials, quotes, customer names, company logos, star ratings, review counts, press mentions, or user and revenue figures that the owner has not supplied.

*Why:* These are factual claims about third parties published under the owner’s name, and nothing in the markup distinguishes an invented quote from a real one — so the owner cannot catch it by looking at the page, and the first person to detect it is a customer, a journalist, or a regulator. Inventing an endorsement or a review is commonly unlawful rather than merely tacky, and the liability falls on the owner rather than on whatever generated the sentence.

*Exceptions:*
- Clearly labelled sample data in an internal demo, a design file, or a component gallery that no public visitor reaches, where the label is inside the rendered component rather than only in a code comment.

Incorrect:

```text
"Vishwakarma cut our release cycle in half." — Sarah Chen, VP Engineering, Northwind Logistics. Plus four greyscale company logos under "Trusted by".
```

Correct:

```text
Testimonial band removed. Handback: "Supply 3 quotes with name, role, company and permission to publish; slot markup kept at src/components/Social.tsx:1."
```

### MUST NOT — Do not ship an interactive control with no destination or handler — `href="#"`, an empty `onClick`, an `alert()`, or a submit that only logs; make it work, disable it with a visible reason, or delete it.

*Why:* A control is a promise, and the visitor pays the cost of discovering it is broken only after committing intent — the most expensive possible moment, because that is the point at which they were willing to act. A disabled control with a stated reason is honest about the same absence; an enabled one that does nothing asserts capability the artefact lacks.

*Exceptions:*
- Throwaway prototypes built to show a layout, and internal demos, where the audience is told which controls are inert before they touch them.

### MUST NOT — Do not ship lorem ipsum, `example.com`, 555 numbers, "Jane Doe", generic avatar rings, stock photography standing in for the product, or `TODO` markers on any visitor-visible surface.

*Why:* Placeholder text signals abandonment more strongly than an unfinished layout does, because a rough layout reads as a work in progress while Latin filler reads as a page nobody checked. It also transfers the discovery to the visitor: the owner scanning a designed page skims filler as texture, and the reader does not.

*Exceptions:*
- Fixtures, storybook entries, test data, and internal component galleries, none of which a visitor reaches.

### MUST NOT — Never write, adapt, or copy the text of a privacy policy, terms of service, cookie notice, or any other document the owner would be legally bound by — name the document, name its trigger, hand it to a human.

*Why:* The visibility asymmetry decides it: a missing policy is a to-do the owner meets on the first walkthrough, while a generated one reads correctly, appears complete, and binds the owner to promises nobody at the company made — retention periods the systems do not honour, subprocessors that are not used, rights procedures nobody staffs. It also removes the only remaining signal that counsel was never involved.

Incorrect:

```text
Generate a standard privacy policy with 30-day log retention, a named DPO, and a subprocessor list, so the footer link resolves.
```

Correct:

```text
Footer links to /privacy, which returns 200 with a page stating the document is pending and committing to nothing. Handback names the two triggers with file and line, and asks the owner or counsel for the text.
```

### MUST NOT — Do not publish uptime, latency, throughput, savings, growth, security posture, certification, or customer-count claims unless the owner supplied them or you measured them in this session and stated the method and conditions.

*Why:* These are the sentences a customer contract, a procurement questionnaire, or a regulator quotes back to the owner, and in the markup they are indistinguishable from decorative copy — so they pass a design review unexamined. A number without its conditions is also a different claim from the one that was measured, which makes an unconditioned figure unfalsifiable rather than merely imprecise.

Incorrect:

```text
"99.99% uptime. SOC 2 compliant. 10,000+ teams ship faster with us."
```

Correct:

```text
"1.2s first load on a throttled 4G profile, cold cache, Moto G4 class device." Everything else moved to the handback list as an owner-supplied claim.
```

### MUST — Every "watch demo", "see it", or "try it" affordance must open the running product, a recording of it, a screenshot of a real build, or a mock labelled as a concept in copy a visitor will read.

*Why:* The hero is the one moment of attention the page reliably gets, and a control that consumes it and delivers nothing is stronger evidence that the product does not exist than silence would have been. A recording or screenshot also cannot be produced without the artefact, which is why it functions as evidence and a rendered mock does not.

*Exceptions:*
- A waitlist or announcement page that promises nothing visible and says so in the page itself, where the page’s job is the promise rather than the product.

Incorrect:

```text
A polished static mock of a dashboard in the hero, with a "Watch demo" button wired to href="#".
```

Correct:

```text
A 20-second screen capture of the real build, or the same mock with "Concept — product in development" set in body copy beside it and the demo button removed.
```

### MUST — Verify that every internal route exists, every anchor has a target on its own page, and every external URL returns 200, before reporting the site complete.

*Why:* Link rot in generated output is systematic rather than random: the nav and footer are written from the sitemap in the brief before the pages behind them are made, so the broken links cluster in exactly the places a spot check treats as representative. Checking three links therefore gives almost no information about the remaining forty.

Incorrect:

```text
Footer ships with About, Careers, Blog, Changelog, Docs, Privacy, Terms. Two of those routes exist.
```

Correct:

```text
Collect every href, resolve each against the route tree, curl the external ones, and either build the missing pages or remove the links. Zero unresolved rows is the pass condition.
```

### MUST — Every form posts to a real endpoint and renders both a success result and a failure result, or it is removed from the page.

*Why:* A form that discards silently is worse than no form at all: the visitor believes contact was made and stops trying, while the owner loses a lead without ever learning one arrived, so the failure is invisible on both sides and self-concealing. A visible failure state is what converts a lost submission into a retry.

*Exceptions:*
- A form whose endpoint is genuinely pending may ship behind an explicit "not yet accepting submissions" state, which is a different claim from a working form.

### MUST — Ship 404 and 500 as designed pages using the site’s own layout, navigation, and a route back, rather than the framework defaults.

*Why:* A framework default breaks the visual frame at the exact moment the visitor already suspects the site is broken, converting a recoverable wrong turn into a judgement about the whole artefact. The 404 is also the one page guaranteed to be reached, since every stale link, typo, and old search result lands there.

### MUST — Confirm by throttling and by blocking the request that every view which fetches data has a loading state and an error state before shipping it.

*Why:* The generated version is developed against local fixtures that resolve in single-digit milliseconds, so a missing state is invisible in every environment the author saw and becomes the default experience on a real network. Throttling and blocking are the only checks that make the absence observable, because reading the code shows the states that were written, not the ones that were not.

*Exceptions:*
- Views whose data is embedded at build time and never fetched at runtime, which cannot occupy either state.

### MUST — Ship a favicon, a distinct `<title>` per route, a meta description, and a share image that renders legibly at 1200x630, and confirm `robots.txt` does not disallow the whole site.

*Why:* These render outside the page, in tabs, bookmarks, search results and pasted links, where the design work is not present to compensate — so a default globe icon and a framework-generated title are the entire first impression in the contexts a site is most often encountered. A staging `robots.txt` carried into production makes the site invisible while every on-page check still passes.

### MUST — Where the page accepts personal data, sets non-essential cookies, loads analytics, or embeds third parties that observe the visitor, ensure a privacy notice exists and is linked, and treat its absence as blocking launch.

*Why:* The obligation is triggered by the collection itself, which means it is created by the edit that added the script or the form — so the trigger is detectable in the code the agent just wrote rather than inferable from the page’s genre. Which rules apply and what the notice must say vary by jurisdiction and by where the visitors are, and those specifics are for the owner’s counsel.

*Exceptions:*
- A static page with no forms, no cookies, no client-side storage, no analytics, and no third-party requests owes no notice, and adding one asserts a data relationship that does not exist.

### MUST — Report completion as three explicit lists — real, placeholder, and needs a human — with each item naming its file and line and each handback naming who must supply what.

*Why:* The artefact was optimised to look finished, so inspecting it cannot separate finished from convincing; the partition is the only thing that makes "done" falsifiable. Naming the file and line also moves the handback from a judgement the owner must re-derive to an action they can take, which is the difference between a list that gets worked and one that gets filed.

*Exceptions:*
- A change small enough that the whole diff is the report — a copy fix, a single component — where a partition would be longer than the work.

### SHOULD — Where real proof does not exist yet, omit the section or render it as a visibly labelled slot naming what the owner must supply, rather than filling it.

*Why:* The costs are asymmetric by an order of magnitude. A missing testimonial band costs a little credibility and reads as early-stage, which is accurate. A fabricated one, once noticed, retroactively discredits every other claim on the page — including the true ones — because the reader now has no way to tell which were generated.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the artefact is launchable and honest: nothing fabricated, nothing dead, the required surfaces present, and the handback list explicit. (blocking)

- For every testimonial, logo, rating, review count, award, and user or revenue figure on the page: who said it, or where did the number come from? Anything without an answer must be removed before you report done.
- Does every "watch demo", "see it", or "try it" control open something a visitor can actually watch or use, and is any mock that is not the real product labelled as a concept in copy a visitor will read?
- Did you resolve every internal route, every anchor target, and every external URL — not a sample — and does every form post to a real endpoint with both a success and a failure rendering?
- Is there any control left that does nothing: `href="#"`, an empty handler, an `alert()`, a submit that only logs? Each one must now work, be disabled with a visible reason, or be gone.
- Did you grep the visitor-visible surfaces for lorem ipsum, `example.com`, 555 numbers, placeholder names, stock stand-ins, and `TODO`, and clear every hit that a visitor reaches?
- Do 404 and 500 render as designed pages on the site’s own layout, and did you confirm by throttling and by blocking a request that every fetching view has a loading state and an error state?
- Are the favicon, per-route titles, meta descriptions, and a share image that is legible at 1200x630 all present, and does `robots.txt` allow the site?
- Which of these does the page actually do — accept personal data, set non-essential cookies, load analytics, embed a third party that sees the visitor’s IP — and for each one, does the required notice exist, is it linked, and does that link resolve?
- Did you write, adapt, or copy any legal, pricing, compliance, security, or performance text? If so, remove it and hand the requirement back with its trigger named by file and line.
- Does your report partition the work into real, placeholder, and needs-a-human, with file and line for each item, rather than asserting that the site is finished?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/pre-launch-checklist.md` — What exactly do I check before reporting a site finished, in what order, and which of those checks can I run rather than eyeball?
- `references/honest-substitutes.md` — The owner has no testimonials, no customers, no built product, no real metrics — what do I put on the page instead of inventing them?
- `references/legal-surface-triggers.md` — This page has a form, an analytics tag, and an embedded video — what documents and consent surfaces does it now owe, and what exactly do I hand to a human?
