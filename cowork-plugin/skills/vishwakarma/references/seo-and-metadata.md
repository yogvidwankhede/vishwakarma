# SEO and Metadata

Discovery is a pipeline — fetch, render, extract, rank, and now quote. Effort at a later
stage is worthless if an earlier one fails: immaculate JSON-LD on a route that serves an
empty `<div id="root">` to a fetcher that does not run JavaScript buys nothing. Work the
pipeline in order.

---

## 1. The markup is the extraction surface

Extractors read a DOM, and only HTML carries structure into it. `<main>`, `<article>`,
`<nav>`, `<time datetime>` and real `<a href>` elements are how a machine finds the
content inside the furniture; a page of `<div>`s makes every consumer guess, and they
guess differently.

Heading structure is where accessibility and discovery are the *same* problem. Screen
reader users navigate by jumping heading to heading, so an outline chosen by font size
rather than rank is unnavigable. That same outline is what chunking pipelines use to split
a page into retrievable passages, and Google names heading elements among the sources for
a title link. Never skip a level, and never use a heading as a subtitle.

---

## 2. Title and description are a UI surface

The `<title>` is the first sentence a user reads about your page — in a result list, a
tab, a bookmark, a shared link. Google composes the displayed title link from `<title>`,
on-page headings, `og:title` and anchor text, and rewrites it when it judges the title
boilerplate, half-empty, stuffed or in the wrong language. There is no character limit;
titles are truncated to device width. Front-load the distinguishing words and put the
brand last behind a separator.

`meta description` is not a ranking input. It is ad copy competing for a click, used only
when Google judges it a better summary than text pulled from the page. One description
repeated site-wide guarantees it is discarded.

---

## 3. Canonicals and duplicates

Every indexable page needs a self-referencing `<link rel="canonical">` with an absolute
URL. Duplicates arrive by accident — tracking parameters, trailing slashes, uppercase
paths, print views, faceted filters — and without one the ranker picks a winner for you,
sometimes the tracked variant.

Canonical is a **strong signal, not a directive**; a 301 is stronger, sitemap inclusion
weaker. Never emit two conflicting canonicals, never point one at a `noindex` or
redirecting URL, and never canonicalise across languages — those are `hreflang`
alternates.

---

## 4. Share previews

`og:title`, `og:description`, `og:image`, `og:url` and `og:type` are read by far
more consumers than Facebook — messaging apps, Slack, LinkedIn, unfurlers of every kind.
Meta documents 1200x630 as the recommended size, 200x200 as the minimum, 1.91:1 as the
target ratio and 8 MB as the cap. Supply `og:image:width`, `og:image:height` and
`og:image:alt`: without dimensions a consumer must download the image before laying out
the card, and many decline.

X's card tags fall back to Open Graph, so the only one worth setting explicitly is
`twitter:card`: `summary_large_image` for a wide crop. **These URLs must be
absolute** — a relative `og:image` is the commonest cause of a blank preview.

---

## 5. Structured data

Use JSON-LD in a `<script type="application/ld+json">` block: it is decoupled from the
DOM, so it survives refactors that would shred microdata attributes. The types worth the
effort are `Organization` (home or about page only), `BreadcrumbList`,
`Article`/`NewsArticle`/`BlogPosting`, and `Product` with a nested `Offer`.
Markup must describe content visible on the page. Validate with validator.schema.org for
vocabulary and the Rich Results Test for eligibility — different questions. See
*structured-data-recipes* for worked examples.

Do not add `FAQPage` expecting a rich result: Google stopped showing FAQ rich results on
**7 May 2026** and is retiring the reporting behind it. Leaving existing markup is
harmless; adding it as a growth tactic is not a plan.

---

## 6. Sitemaps and robots directives

A sitemap is a discovery aid, not an indexing guarantee. Cap each file at 50,000 URLs or
50 MB uncompressed and use an index above that. Google ignores `<priority>` and
`<changefreq>` outright, and uses `<lastmod>` only if it is consistently accurate — a
build timestamp on every URL destroys its value.

The pairing that trips teams up: **`robots.txt` controls crawling, `noindex` controls
indexing, and they compose badly.** Disallowing a URL stops the fetch, so the crawler
never sees the `noindex`, and the URL can persist in the index without a snippet. To
remove a page, allow the crawl and serve `noindex`. The other directives worth knowing:
`nosnippet`, `max-snippet`, `max-image-preview`, `data-nosnippet` on a subtree,
`unavailable_after`.

---

## 7. Rendering is the decisive choice

Googlebot runs an evergreen Chromium and does render JavaScript, on a deferred queue.
Almost nothing else does. Vercel's December 2024 crawler analysis found GPTBot, ClaudeBot,
OAI-SearchBot, ChatGPT-User and PerplexityBot all fetching JavaScript without executing
it; Facebook's unfurler has never run scripts.

A client-only SPA is therefore roughly invisible to everything but Google, and fragile
even there. Server-render or statically generate any route that must be discovered, and
put its metadata in the initial response rather than mutating `document.title` after
hydration.

---

## 8. Core Web Vitals, honestly

LCP under 2.5 s, INP under 200 ms, CLS under 0.1, at the 75th percentile of real users.
Worth hitting — they are user experience before they are anything else.

But the ranking claim is overstated. Google's page-experience documentation says there is
*no single page experience signal*, that vitals are among many inputs, and that good
scores do not guarantee ranking. Relevance dominates. Treat vitals as a conversion lever
and a tiebreaker, not a ranking strategy.

---

## 9. hreflang and URL design

`hreflang` must be **bidirectional and self-referencing**: if A lists B, B lists A and
itself, with fully-qualified URLs. Use ISO 639-1 languages optionally plus ISO 3166-1
alpha-2 regions — `en`, `en-GB`, `zh-Hans`. A region alone is invalid, and `uk`
means Ukrainian, not the United Kingdom. Add `x-default` for the fallback.

URLs are a permanent interface: lowercase, hyphenated, meaningful, free of session state.
Changing one discards its links unless you 301, and each extra hop in a chain costs a
round trip on every visit.

---

## 10. AI crawlers: decide, do not drift

The agents are split by purpose, and the split is the point. OpenAI documents `GPTBot`
(training), `OAI-SearchBot` (ChatGPT search) and `ChatGPT-User` (user-initiated);
Anthropic documents `ClaudeBot`, `Claude-SearchBot` and `Claude-User` on the same
lines; Google separates `Google-Extended` (generative-AI training) from `Googlebot`.

So "block AI" is not one decision. Blocking a training agent forfeits no visibility today;
blocking a *search* agent removes you from an answer surface. A publisher with licensing
leverage and a docs site wanting citations will rationally choose opposite policies. Make
the choice in `robots.txt`, deliberately, and record why.

What makes a page quotable is unglamorous: a direct answer near the top, paragraphs that
survive extraction without their surroundings, visible dates and authorship, specific
figures. Google states plainly that no special file or markup is needed for AI Overviews.

**Uncertainties, as such.** Google has confirmed `llms.txt` is not used by Search and no
engine documents consuming it, so treat it as speculative. The IETF AIPREF working group
is drafting a preference vocabulary, but it is a draft, not a standard. Whether structured
data influences LLM citation is unmeasured — add it for rich results and disambiguation,
not on that theory.

## Rules

### MUST NOT — Do not canonicalise a page to a URL that is noindex, redirects, or is a different language version of the same content.

*Why:* A canonical asserts "index that instead of this". Pointing at a noindex target asks the engine to index nothing, which usually results in both URLs being dropped. Language variants are alternates, not duplicates, and collapsing them removes every localised page but one from its own market.

### MUST NOT — Do not mark up prices, ratings, dates, authors or breadcrumbs that are not visible in the rendered page content.

*Why:* Google requires structured data to represent content visible to users, and enforces it with manual actions that remove rich result eligibility site-wide. Beyond the policy, a mismatch between markup and page produces a result that misleads the user, who then bounces — which is the outcome the markup was meant to prevent.

*Source:* [Google Search Central, structured data general guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

### MUST NOT — Do not disallow a URL in robots.txt when the goal is to remove it from the index; serve a crawlable page with noindex instead.

*Why:* Google states that if a page is disallowed from crawling, indexing and serving rules on that page are never found and are therefore ignored. The URL can remain indexed on the strength of external links, without a snippet, and there is no mechanism left to remove it.

*Source:* [Google Search Central, robots meta tag specifications](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)

### MUST — Server-render or statically generate any route that must be discoverable, so its content and metadata are present in the initial HTML response.

*Why:* Vercel's December 2024 analysis of crawler logs found that GPTBot, ClaudeBot, OAI-SearchBot, ChatGPT-User and PerplexityBot fetch JavaScript files but do not execute them. Googlebot renders on a deferred queue. A client-only route therefore presents an empty document to every consumer except Google, and a delayed one to Google.

*Source:* [Vercel, "The rise of the AI crawler" (December 2024)](https://vercel.com/blog/the-rise-of-the-ai-crawler)

*Exceptions:*
- Authenticated application routes that should never be indexed anyway.

### MUST — Give every indexable page its own title and meta description, with the distinguishing words at the start of the title and the brand at the end.

*Why:* Google composes the displayed title link from the title element, headings, og:title and anchor text, and rewrites titles it judges boilerplate or half-empty. Titles are truncated to device width rather than a fixed character count, so trailing words are the ones lost.

*Source:* [Google Search Central, "Influencing your title links"](https://developers.google.com/search/docs/appearance/title-link)

Incorrect:

```html
<title>Acme Instruments | Precision Measurement Hardware for Laboratories | Thermocouple K-200</title>
```

Correct:

```html
<title>Thermocouple K-200 — Type-K probe to 1100°C | Acme</title>
```

### MUST — Emit exactly one self-referencing rel="canonical" per indexable page, using an absolute URL.

*Why:* Duplicate URLs arise mechanically from tracking parameters, trailing slashes and faceted filters. Without a stated canonical the search engine selects one itself, and it may select the parameterised variant, splitting link signals across URLs. Relative canonicals resolve against the current document and break the moment the page is served from a second path.

*Source:* [Google Search Central, "How to specify a canonical URL"](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

### MUST — Use one h1 per page and a heading outline that never skips a level, chosen by rank rather than by desired font size.

*Why:* Screen reader users navigate by jumping between headings, so a level chosen for its type size makes the document structure unnavigable. The same outline is what passage-extraction pipelines use to split a page into retrievable chunks, and Google lists heading elements among the sources for a title link, so one broken outline degrades accessibility and discovery simultaneously.

Incorrect:

```html
<h1>Pricing</h1>
<h4>Per seat</h4>
<h2>A quiet subtitle</h2>
```

Correct:

```html
<h1>Pricing</h1>
<h2>Per seat</h2>
<p class="subtitle">A quiet subtitle</p>
```

### MUST — Specify og:image with an absolute URL, and supply og:image:width, og:image:height and og:image:alt alongside it.

*Why:* Unfurlers fetch the HTML from a different origin and cannot resolve a relative path, so a relative og:image yields a blank card. Without declared dimensions the consumer must download the image before it can lay out the card, and many time out or skip it rather than wait.

*Source:* [Meta for Developers, sharing image guidance](https://developers.facebook.com/docs/sharing/webmasters/images/)

### MUST — Generate JSON-LD with a real serialiser such as JSON.stringify rather than by string concatenation or template interpolation.

*Why:* Concatenated JSON breaks on any unescaped quote, and a product name or article title containing the sequence closing a script tag terminates the block early, turning content into markup — an injection vector as well as a silently invalid payload. A single trailing comma voids the entire block, and consumers report nothing.

### MUST — Make hreflang annotations bidirectional and self-referencing, with fully-qualified URLs and valid ISO 639-1 language codes.

*Why:* Google requires that if page X links to page Y as an alternate, page Y links back to X and to itself; unreciprocated annotations are ignored, silently, for the whole cluster. A region code alone is invalid, and the common guess "uk" is the ISO 639-1 code for Ukrainian, not a region.

*Source:* [Google Search Central, "Localized versions of your pages"](https://developers.google.com/search/docs/specialty/international/localized-versions)

Incorrect:

```html
<link rel="alternate" hreflang="uk" href="/gb/pricing" />
```

Correct:

```html
<link rel="alternate" hreflang="en-GB" href="https://example.com/gb/pricing" />
<link rel="alternate" hreflang="x-default" href="https://example.com/pricing" />
```

### MUST — Treat URLs as a permanent interface: keep them lowercase, hyphenated and free of session state, and 301 any change directly to the final destination.

*Why:* A changed URL without a redirect discards every external link pointing at it, and those links are not recoverable. Chained redirects add a full round trip each to every visit and consume crawl budget, so a redirect that points at another redirect costs latency permanently rather than once.

### SHOULD NOT — Do not add FAQPage markup expecting a rich result, and do not treat its removal as a reason to delete an existing block.

*Why:* Google stopped showing FAQ rich results on 7 May 2026 and is removing the search appearance filter and Rich Results Test support in June 2026 and Search Console API support in August 2026. Unused structured data does not harm visibility, so removal is unnecessary work, but adding it now returns nothing.

*Source:* [Google Search Central, FAQPage structured data (deprecation notice)](https://developers.google.com/search/docs/appearance/structured-data/faqpage)

### SHOULD NOT — Do not add llms.txt or similar files on the assumption that answer engines consume them, and do not present them as a ranking measure.

*Why:* Google has stated llms.txt is not used by Search, and no major engine documents consuming it; Google separately states that no new machine-readable files or markup are needed to appear in AI Overviews or AI Mode. Shipping one is cheap but reporting it as a discovery improvement misrepresents an unverified claim as a result.

*Source:* [Google Search Central, "AI features and your website"](https://developers.google.com/search/docs/appearance/ai-features)

*Exceptions:*
- Publishing a curated Markdown index for your own documentation tooling or agents, where the benefit is internal rather than a discovery claim.

### SHOULD — Author Open Graph images at 1200x630 (1.91:1), never below the 200x200 minimum, and keep the file under 8 MB.

*Why:* Meta documents 1200x630 as the size that renders sharply on high-resolution displays and 1.91:1 as the ratio that avoids cropping in feed. Images below 600x315 are rendered as a small thumbnail rather than a large card, which is a visible downgrade in every consumer that follows the same convention.

*Source:* [Meta for Developers, sharing image guidance](https://developers.facebook.com/docs/sharing/webmasters/images/)

### SHOULD — Validate structured data with both validator.schema.org for vocabulary and the Rich Results Test for eligibility before shipping it.

*Why:* The two tools answer different questions: schema.org validation confirms the types and properties exist, while the Rich Results Test confirms Google will act on them, which is a narrower set. Markup that passes the first and fails the second is syntactically perfect and operationally useless.

### SHOULD — Keep each sitemap file within 50,000 URLs and 50 MB uncompressed, emit lastmod only when it reflects a real content change, and omit priority and changefreq.

*Why:* Google documents the 50,000-URL and 50 MB limits and states that it ignores priority and changefreq outright. It uses lastmod only when the value is consistently and verifiably accurate, so stamping every URL with the build time trains the crawler to disregard the field for the whole site.

*Source:* [Google Search Central, "Build and submit a sitemap"](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

### SHOULD — Target LCP under 2.5 s, INP under 200 ms and CLS under 0.1 at the 75th percentile of real users, without treating them as a ranking strategy.

*Why:* These are the documented "good" thresholds and the documented assessment percentile. Google states there is no single page experience ranking signal and that good Core Web Vitals do not guarantee ranking, so the honest justification is user experience and conversion, with ranking as a marginal tiebreaker.

*Source:* [web.dev, "Web Vitals"; Google Search Central, "Understanding page experience"](https://developers.google.com/search/docs/appearance/page-experience)

### SHOULD — State an explicit robots.txt policy for AI crawlers, distinguishing training agents from search and user-initiated agents rather than blocking or allowing them as one class.

*Why:* The vendors separate the roles: OpenAI documents GPTBot for training, OAI-SearchBot for ChatGPT search inclusion and ChatGPT-User for user-initiated fetches; Anthropic documents ClaudeBot, Claude-SearchBot and Claude-User; Google separates Google-Extended from Googlebot. Blocking a training agent costs no visibility today, while blocking a search agent removes the site from an answer surface, so a single blanket rule always gets one of the two decisions wrong.

*Source:* [OpenAI bots documentation; Anthropic crawler support article](https://developers.openai.com/api/docs/bots)

*Exceptions:*
- User-initiated fetch agents may not consult robots.txt at all, since the request originates from a person rather than a crawl; verify the vendor documentation before relying on a rule for those.

### SHOULD — Write sections that answer their heading directly in the first paragraph and remain intelligible when extracted without surrounding context.

*Why:* Retrieval pipelines split pages into passages and present them detached from the page. A paragraph opening with "As mentioned above" or resolving a pronoun three paragraphs back becomes meaningless once extracted, so it is discarded in favour of a competitor whose paragraph stands alone.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm content and metadata exist without JavaScript execution. (blocking)

- With JavaScript disabled, or in the raw response body from curl, does the page contain its main content, its h1, its title and its meta description?
- Is any metadata set by mutating document.title or injecting tags after hydration?
- If metadata streams rather than blocking, which consumers are on the HTML-limited list, and which AI crawlers are not?
- Does the JSON-LD block appear in the server-rendered HTML rather than being added client-side?

### Confirm titles, descriptions and share previews are correct per page. (blocking)

- Is the title unique to this page, with the distinguishing words first and the brand last?
- Does the description describe this page specifically, rather than repeating a site-wide line?
- Are og:title, og:description, og:image, og:url and og:type present, and is the image URL absolute?
- Are og:image:width, og:image:height and og:image:alt set, and is the image at least 1200x630?
- Is twitter:card set to summary_large_image where a wide crop is intended?

### Confirm JSON-LD is valid, honest and eligible.

- Does every marked-up value — price, rating, date, author, breadcrumb — appear in the rendered page?
- Was the JSON produced by a serialiser, and does the block parse?
- Does it pass validator.schema.org, and separately does the live URL pass the Rich Results Test?
- Does the breadcrumb trail in the markup match the trail rendered on the page?
- Are dates ISO 8601 with a timezone offset, and is each author a separate entry rather than a joined string?

### Confirm the page can be crawled and indexed as intended. (blocking)

- Does the page carry exactly one canonical, absolute and self-referencing?
- Does any canonical point at a URL that is noindex, redirects, or is a different language?
- Is any URL both disallowed in robots.txt and expected to be de-indexed by a noindex tag?
- Is the page reachable by a crawlable anchor from somewhere in the site, rather than only from a client-side router push?
- Is it listed in a sitemap under the 50,000-URL and 50 MB limits, with lastmod reflecting a real change?

### Confirm localisation annotations and URL changes are safe.

- Does every hreflang cluster reciprocate, including a self-reference, using fully-qualified URLs?
- Are all language codes valid ISO 639-1, with regions as ISO 3166-1 alpha-2, and is there an x-default?
- Has any URL changed in this work, and if so does a single 301 point straight at the final destination?
- Are there any redirect chains of two or more hops?

### Confirm the AI crawler policy is deliberate and the content is quotable.

- Does robots.txt name training agents and search agents separately, and can you state why each rule exists?
- Would the first paragraph under each heading answer that heading if it were extracted alone?
- Are publication and modification dates, and authorship, stated in the visible page rather than only in markup?
- Have any claims been made to the user about llms.txt or AI ranking that are not supported by vendor documentation?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/structured-data-recipes.md` — What exactly does correct JSON-LD look like for an article, a product, an organisation and a breadcrumb trail, and how do I validate it?
- `references/nextjs-metadata.md` — What are the exact Next.js metadata APIs, how do they merge across layouts, and what are the traps with client components, streaming and relative URLs?
