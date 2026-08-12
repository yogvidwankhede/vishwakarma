// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * SEO is the frontend discipline most polluted by folklore, because its feedback loop is
 * weeks long and its ground truth is proprietary. The result is a field where teams argue
 * about keyword density while shipping a route that renders an empty `<div id="root">` to
 * every crawler that does not execute JavaScript.
 *
 * This skill therefore sticks to what is verifiable: what the HTML must contain, what the
 * documented directives actually do, what the crawlers documented behaviour is, and where
 * the commonly-repeated claims are overstated. Where the answer is genuinely unknown — and
 * with answer engines a lot of it is — the skill says so rather than inventing a number.
 */
export const seoAndMetadata: SkillManifest = {
  vsm: '1.0',
  id: 'seo-and-metadata',
  name: 'SEO and Metadata',
  description:
    'Use when adding page metadata, structured data, sitemaps, canonicals or hreflang, or when a page is not indexed, previewed or cited correctly.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'performance',
  tags: ['seo', 'metadata', 'structured-data', 'json-ld', 'open-graph', 'crawling', 'nextjs'],

  activation: {
    intents: [
      'adding or fixing page titles, meta descriptions, or social share previews',
      'a page is missing from search results or shows the wrong title or snippet',
      'adding structured data, JSON-LD, or rich result markup',
      'setting up a sitemap, robots.txt, canonical URLs, or hreflang',
      'deciding whether to server-render, statically generate, or client-render a route',
      'deciding whether to allow or block AI crawlers and answer engines',
      'a shared link renders with no image or the wrong image',
    ],
    globs: [
      '**/layout.{ts,tsx,js,jsx}',
      '**/page.{ts,tsx,js,jsx}',
      '**/head.{ts,tsx,js,jsx}',
      '**/sitemap.{ts,js,xml}',
      '**/robots.{ts,js,txt}',
      '**/opengraph-image.*',
      '**/*.html',
    ],
    keywords: [
      'seo',
      'metadata',
      'meta tags',
      'open graph',
      'og:image',
      'twitter card',
      'json-ld',
      'structured data',
      'schema.org',
      'canonical',
      'hreflang',
      'sitemap',
      'robots.txt',
      'llms.txt',
    ],
  },

  content: {
    summary:
      'Make pages discoverable by machines: server-rendered HTML, a real heading outline, accurate titles and canonicals, valid JSON-LD, and a deliberate policy for AI crawlers.',

    body: `# SEO and Metadata

Discovery is a pipeline — fetch, render, extract, rank, and now quote. Effort at a later
stage is worthless if an earlier one fails: immaculate JSON-LD on a route that serves an
empty \`<div id="root">\` to a fetcher that does not run JavaScript buys nothing. Work the
pipeline in order.

---

## 1. The markup is the extraction surface

Extractors read a DOM, and only HTML carries structure into it. \`<main>\`, \`<article>\`,
\`<nav>\`, \`<time datetime>\` and real \`<a href>\` elements are how a machine finds the
content inside the furniture; a page of \`<div>\`s makes every consumer guess, and they
guess differently.

Heading structure is where accessibility and discovery are the *same* problem. Screen
reader users navigate by jumping heading to heading, so an outline chosen by font size
rather than rank is unnavigable. That same outline is what chunking pipelines use to split
a page into retrievable passages, and Google names heading elements among the sources for
a title link. Never skip a level, and never use a heading as a subtitle.

---

## 2. Title and description are a UI surface

The \`<title>\` is the first sentence a user reads about your page — in a result list, a
tab, a bookmark, a shared link. Google composes the displayed title link from \`<title>\`,
on-page headings, \`og:title\` and anchor text, and rewrites it when it judges the title
boilerplate, half-empty, stuffed or in the wrong language. There is no character limit;
titles are truncated to device width. Front-load the distinguishing words and put the
brand last behind a separator.

\`meta description\` is not a ranking input. It is ad copy competing for a click, used only
when Google judges it a better summary than text pulled from the page. One description
repeated site-wide guarantees it is discarded.

---

## 3. Canonicals and duplicates

Every indexable page needs a self-referencing \`<link rel="canonical">\` with an absolute
URL. Duplicates arrive by accident — tracking parameters, trailing slashes, uppercase
paths, print views, faceted filters — and without one the ranker picks a winner for you,
sometimes the tracked variant.

Canonical is a **strong signal, not a directive**; a 301 is stronger, sitemap inclusion
weaker. Never emit two conflicting canonicals, never point one at a \`noindex\` or
redirecting URL, and never canonicalise across languages — those are \`hreflang\`
alternates.

---

## 4. Share previews

\`og:title\`, \`og:description\`, \`og:image\`, \`og:url\` and \`og:type\` are read by far
more consumers than Facebook — messaging apps, Slack, LinkedIn, unfurlers of every kind.
Meta documents 1200x630 as the recommended size, 200x200 as the minimum, 1.91:1 as the
target ratio and 8 MB as the cap. Supply \`og:image:width\`, \`og:image:height\` and
\`og:image:alt\`: without dimensions a consumer must download the image before laying out
the card, and many decline.

X's card tags fall back to Open Graph, so the only one worth setting explicitly is
\`twitter:card\`: \`summary_large_image\` for a wide crop. **These URLs must be
absolute** — a relative \`og:image\` is the commonest cause of a blank preview.

---

## 5. Structured data

Use JSON-LD in a \`<script type="application/ld+json">\` block: it is decoupled from the
DOM, so it survives refactors that would shred microdata attributes. The types worth the
effort are \`Organization\` (home or about page only), \`BreadcrumbList\`,
\`Article\`/\`NewsArticle\`/\`BlogPosting\`, and \`Product\` with a nested \`Offer\`.
Markup must describe content visible on the page. Validate with validator.schema.org for
vocabulary and the Rich Results Test for eligibility — different questions. See
*structured-data-recipes* for worked examples.

Do not add \`FAQPage\` expecting a rich result: Google stopped showing FAQ rich results on
**7 May 2026** and is retiring the reporting behind it. Leaving existing markup is
harmless; adding it as a growth tactic is not a plan.

---

## 6. Sitemaps and robots directives

A sitemap is a discovery aid, not an indexing guarantee. Cap each file at 50,000 URLs or
50 MB uncompressed and use an index above that. Google ignores \`<priority>\` and
\`<changefreq>\` outright, and uses \`<lastmod>\` only if it is consistently accurate — a
build timestamp on every URL destroys its value.

The pairing that trips teams up: **\`robots.txt\` controls crawling, \`noindex\` controls
indexing, and they compose badly.** Disallowing a URL stops the fetch, so the crawler
never sees the \`noindex\`, and the URL can persist in the index without a snippet. To
remove a page, allow the crawl and serve \`noindex\`. The other directives worth knowing:
\`nosnippet\`, \`max-snippet\`, \`max-image-preview\`, \`data-nosnippet\` on a subtree,
\`unavailable_after\`.

---

## 7. Rendering is the decisive choice

Googlebot runs an evergreen Chromium and does render JavaScript, on a deferred queue.
Almost nothing else does. Vercel's December 2024 crawler analysis found GPTBot, ClaudeBot,
OAI-SearchBot, ChatGPT-User and PerplexityBot all fetching JavaScript without executing
it; Facebook's unfurler has never run scripts.

A client-only SPA is therefore roughly invisible to everything but Google, and fragile
even there. Server-render or statically generate any route that must be discovered, and
put its metadata in the initial response rather than mutating \`document.title\` after
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

\`hreflang\` must be **bidirectional and self-referencing**: if A lists B, B lists A and
itself, with fully-qualified URLs. Use ISO 639-1 languages optionally plus ISO 3166-1
alpha-2 regions — \`en\`, \`en-GB\`, \`zh-Hans\`. A region alone is invalid, and \`uk\`
means Ukrainian, not the United Kingdom. Add \`x-default\` for the fallback.

URLs are a permanent interface: lowercase, hyphenated, meaningful, free of session state.
Changing one discards its links unless you 301, and each extra hop in a chain costs a
round trip on every visit.

---

## 10. AI crawlers: decide, do not drift

The agents are split by purpose, and the split is the point. OpenAI documents \`GPTBot\`
(training), \`OAI-SearchBot\` (ChatGPT search) and \`ChatGPT-User\` (user-initiated);
Anthropic documents \`ClaudeBot\`, \`Claude-SearchBot\` and \`Claude-User\` on the same
lines; Google separates \`Google-Extended\` (generative-AI training) from \`Googlebot\`.

So "block AI" is not one decision. Blocking a training agent forfeits no visibility today;
blocking a *search* agent removes you from an answer surface. A publisher with licensing
leverage and a docs site wanting citations will rationally choose opposite policies. Make
the choice in \`robots.txt\`, deliberately, and record why.

What makes a page quotable is unglamorous: a direct answer near the top, paragraphs that
survive extraction without their surroundings, visible dates and authorship, specific
figures. Google states plainly that no special file or markup is needed for AI Overviews.

**Uncertainties, as such.** Google has confirmed \`llms.txt\` is not used by Search and no
engine documents consuming it, so treat it as speculative. The IETF AIPREF working group
is drafting a preference vocabulary, but it is a draft, not a standard. Whether structured
data influences LLM citation is unmeasured — add it for rich results and disambiguation,
not on that theory.`,

    references: [
      {
        id: 'structured-data-recipes',
        title: 'Structured data recipes with worked JSON-LD',
        answers:
          'What exactly does correct JSON-LD look like for an article, a product, an organisation and a breadcrumb trail, and how do I validate it?',
        content: `# Structured data recipes

All examples are JSON-LD in \`<script type="application/ld+json">\`. Google's requirement
that structured data describe content visible on the page is a policy, not a suggestion:
marking up a price, a rating or a date the user cannot see is a manual-action risk.

## Placement and shape

A page may carry several blocks, or one block containing an array, or a single graph:

    { "@context": "https://schema.org", "@graph": [ {...}, {...} ] }

Prefer \`@graph\` once entities cross-reference each other, because \`@id\` values resolve
within the document. Use a stable URI as \`@id\` — the page URL with a fragment works:
\`https://example.com/#organization\`.

## Organization

Google recommends placing this once, on the home page or a single about page, not on
every page. There are no strictly required properties; these are the ones that do work.

    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://example.com/#organization",
      "name": "Acme Instruments",
      "url": "https://example.com",
      "logo": "https://example.com/logo-512.png",
      "description": "Precision measurement hardware for laboratories.",
      "foundingDate": "2011-03-01",
      "sameAs": [
        "https://www.linkedin.com/company/acme-instruments",
        "https://github.com/acme-instruments"
      ]
    }

\`logo\` must be at least 112x112 px. \`sameAs\` is the entity-disambiguation lever: it is
how a machine decides your "Acme" is this Acme and not the four others. \`contactPoint\`,
\`address\`, \`telephone\` and \`vatID\` are further recommended trust properties.

## BreadcrumbList

Cheap, widely supported, and it turns the URL line in the result into a readable path.
\`position\` is 1-indexed and contiguous. Omit \`item\` on the final element.

    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home",
          "item": "https://example.com/" },
        { "@type": "ListItem", "position": 2, "name": "Sensors",
          "item": "https://example.com/sensors/" },
        { "@type": "ListItem", "position": 3, "name": "Thermocouple K-200" }
      ]
    }

The trail must match the one rendered on the page. Two different breadcrumbs — one visual,
one marked up — is the commonest cause of the rich result being dropped silently.

## Article

Supported types are \`Article\`, \`NewsArticle\` and \`BlogPosting\`. Google lists no
required properties; the following are the recommended set.

    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "Calibrating thermocouples without a reference bath",
      "image": [
        "https://example.com/img/calibration-16x9.jpg",
        "https://example.com/img/calibration-1x1.jpg"
      ],
      "datePublished": "2026-02-11T09:00:00+00:00",
      "dateModified": "2026-05-02T14:20:00+00:00",
      "author": [{
        "@type": "Person",
        "name": "Priya Raman",
        "url": "https://example.com/authors/priya-raman"
      }],
      "publisher": { "@id": "https://example.com/#organization" }
    }

Four details carry most of the value. Supply **multiple images** at 16:9, 4:3 and 1:1;
Google asks for at least 50,000 pixels of area (width x height), crawlable and indexable.
Dates must be **ISO 8601 with a timezone offset** — a bare date is ambiguous by up to a
day. Each author gets **its own \`author\` entry**, never a comma-joined string, with
\`name\` holding the name alone; job titles go in \`jobTitle\`, and \`url\` or \`sameAs\`
should resolve to a real profile page. Keep \`headline\` concise, since long titles are
truncated on some surfaces.

## Product

Google distinguishes two experiences. A **product snippet** suits pages where the item
cannot be bought directly; a **merchant listing** suits pages where it can, and requires
\`name\`, \`image\` and a nested \`offers\` carrying \`price\` (or
\`priceSpecification.price\`), \`priceCurrency\` and \`availability\`. Merchant listings
require a price greater than zero.

    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Thermocouple K-200",
      "image": ["https://example.com/img/k200-front.jpg"],
      "sku": "K200-STD",
      "gtin13": "5012345678900",
      "brand": { "@type": "Brand", "name": "Acme Instruments" },
      "aggregateRating": {
        "@type": "AggregateRating", "ratingValue": 4.6, "reviewCount": 128
      },
      "offers": {
        "@type": "Offer",
        "url": "https://example.com/sensors/k200",
        "price": 149.00,
        "priceCurrency": "GBP",
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "2026-12-31",
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "GB",
          "returnPolicyCategory":
            "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 30,
          "returnFees": "https://schema.org/FreeReturn"
        }
      }
    }

\`price\` is a number, not a string with a currency symbol; the symbol lives in
\`priceCurrency\` as an ISO 4217 code. \`availability\` takes a schema.org enumeration URL,
not the words "in stock". Identifiers — \`gtin\`, \`mpn\`, \`sku\` — are recommended rather
than required, but they are what lets a product be matched across sites, so omitting them
forfeits most of the benefit. \`shippingDetails\` and \`hasMerchantReturnPolicy\` drive the
shipping and returns annotations in merchant experiences.

Never mark up an \`aggregateRating\` that is not rendered on the page, and never
self-serve a review of your own product.

## Validation, in order

1. **JSON parses.** A trailing comma silently voids the whole block. Generate with
   \`JSON.stringify\`, never by concatenation — which is also how the markup becomes an
   injection vector when a product name contains a closing script tag.
2. **validator.schema.org** — vocabulary: are these real types and properties?
3. **Rich Results Test** (search.google.com/test/rich-results) — Google eligibility, a
   narrower and different question. Test the live URL, because it renders the page.
4. **Search Console** rich result reports — the only source of truth at scale, and the only
   one that surfaces errors on pages you did not think to test.

Google is retiring FAQ support across these tools through 2026: the search appearance and
Rich Results Test support in June, the Search Console API in August.`,
      },
      {
        id: 'nextjs-metadata',
        title: 'Metadata in a Next.js App Router application',
        answers:
          'What are the exact Next.js metadata APIs, how do they merge across layouts, and what are the traps with client components, streaming and relative URLs?',
        content: `# Metadata in a Next.js App Router application

Verified against the Next.js documentation as of March 2026 (docs version 16.2.x). The
Metadata API was introduced in 13.2.

## Two exports, never both

From a \`layout.tsx\` or \`page.tsx\`, export either a static \`metadata\` object or an
async \`generateMetadata\` function — exporting both from the same segment is an error.
Both are **Server Components only**, because metadata must resolve on the server before
the page renders.

    import type { Metadata } from 'next'

    export const metadata: Metadata = {
      title: 'Pricing',
      description: 'Per-seat and usage-based plans.',
    }

Dynamic routes use the function form, which receives the route props and a promise of the
parent's resolved metadata:

    import type { Metadata, ResolvingMetadata } from 'next'

    type Props = {
      params: Promise<{ slug: string }>
      searchParams: Promise<Record<string, string | string[] | undefined>>
    }

    export async function generateMetadata(
      { params }: Props,
      parent: ResolvingMetadata,
    ): Promise<Metadata> {
      const { slug } = await params
      const post = await getPost(slug)
      const previousImages = (await parent).openGraph?.images || []
      return {
        title: post.title,
        description: post.excerpt,
        alternates: { canonical: \`/blog/\${slug}\` },
        openGraph: { images: [post.image, ...previousImages] },
      }
    }

Note that \`params\` and \`searchParams\` are **promises** and must be awaited.
\`searchParams\` is available only in \`page\` segments, not layouts. \`fetch\` calls
inside \`generateMetadata\` are memoised against the same calls in the page, so fetching
the same record twice does not cost two requests; where \`fetch\` is not the transport,
wrap the loader in React's \`cache\`.

## metadataBase makes relative URLs legal

Set once in the root layout. Without it, any relative URL in a metadata field is a build
error; with it, canonical, hreflang and Open Graph image paths can be relative.

    export const metadata: Metadata = {
      metadataBase: new URL('https://example.com'),
      title: { default: 'Acme', template: '%s | Acme' },
      alternates: {
        canonical: '/',
        languages: { 'en-GB': '/en-gb', 'de-DE': '/de-de' },
      },
      openGraph: { siteName: 'Acme', locale: 'en_GB', type: 'website' },
      twitter: { card: 'summary_large_image' },
    }

\`title\` accepts a string or an object with \`default\`, \`template\` and \`absolute\`.
The template applies to **child** segments only, never to the segment declaring it, and
\`default\` is mandatory alongside \`template\`. A child needing to escape the template
sets \`title: { absolute: 'Login' }\`.

## Merging is shallow, and this is the classic bug

Metadata resolves root-downward and merges **shallowly**. A child that sets
\`openGraph.title\` replaces the *entire* parent \`openGraph\` object — losing
\`siteName\`, \`locale\`, \`type\` and images. Hoist the shared parts into a module and
spread them:

    // shared-metadata.ts
    export const og = { siteName: 'Acme', locale: 'en_GB', type: 'website' } as const

    // app/blog/[slug]/page.tsx
    openGraph: { ...og, title: post.title, type: 'article' }

## File conventions beat the object

File-based metadata takes priority over the object and the function. Prefer it, because
it cannot drift out of sync with the asset:

- \`app/opengraph-image.tsx\` (or \`.png\`/\`.jpg\`) — emits \`og:image\` plus width,
  height and type automatically. Export \`size\`, \`contentType\` and \`alt\`, and render
  with \`ImageResponse\` for a generated card.
- \`app/twitter-image.tsx\` — the same for \`twitter:image\`.
- \`app/icon.tsx\`, \`app/apple-icon.tsx\`, \`app/manifest.ts\`.
- \`app/sitemap.ts\` exporting a \`MetadataRoute.Sitemap\`.
- \`app/robots.ts\` exporting a \`MetadataRoute.Robots\`.

A minimal robots route that expresses an explicit AI policy:

    import type { MetadataRoute } from 'next'

    export default function robots(): MetadataRoute.Robots {
      return {
        rules: [
          { userAgent: '*', allow: '/', disallow: ['/api/', '/draft/'] },
          { userAgent: 'GPTBot', disallow: '/' },
          { userAgent: 'OAI-SearchBot', allow: '/' },
        ],
        sitemap: 'https://example.com/sitemap.xml',
      }
    }

## Viewport moved out

\`viewport\`, \`themeColor\` and \`colorScheme\` were deprecated in the metadata object in
13.2 and live in a separate export:

    import type { Viewport } from 'next'

    export const viewport: Viewport = {
      themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0b0b0d' },
      ],
      width: 'device-width',
      initialScale: 1,
    }

## Streaming metadata, and who it affects

Since 15.2, when \`generateMetadata\` cannot be prerendered, Next.js sends the initial UI
first and appends the resolved tags to \`<body>\` afterwards. The documentation states this
was verified against bots that execute JavaScript and inspect the DOM, such as Googlebot.
For **HTML-limited bots** that do not — \`facebookexternalhit\` is the documented example —
Next.js detects the user agent and blocks rendering so the tags land in \`<head>\`. The
list is overridable via \`htmlLimitedBots\` in \`next.config\`; setting it to \`/.*/\`
disables streaming metadata entirely at the cost of TTFB. This matters because AI crawlers
also do not execute JavaScript, and they are not all on the default list.

## Traps

- **JSON-LD has no metadata field.** Render it in the component tree as a \`<script
  type="application/ld+json">\` with \`dangerouslySetInnerHTML\` and \`JSON.stringify\`.
- **Client components cannot export metadata.** Keep \`page.tsx\` a server component and
  push \`'use client'\` down into a child.
- **Canonicals are per-page.** A canonical set only in the root layout makes every route
  claim to be the home page — worse than no canonical at all.
- **Open Graph images in the object need absolute URLs** unless \`metadataBase\` is set.`,
      },
    ],
  },

  rules: [
    {
      id: 'seo-and-metadata/server-render-indexable-routes',
      strength: 'must',
      statement:
        'Server-render or statically generate any route that must be discoverable, so its content and metadata are present in the initial HTML response.',
      evidence: {
        rationale:
          "Vercel's December 2024 analysis of crawler logs found that GPTBot, ClaudeBot, OAI-SearchBot, ChatGPT-User and PerplexityBot fetch JavaScript files but do not execute them. Googlebot renders on a deferred queue. A client-only route therefore presents an empty document to every consumer except Google, and a delayed one to Google.",
        source: 'Vercel, "The rise of the AI crawler" (December 2024)',
        url: 'https://vercel.com/blog/the-rise-of-the-ai-crawler',
        confidence: 'strong',
      },
      exceptions: ['Authenticated application routes that should never be indexed anyway.'],
      verifiedBy: 'rendering-audit',
    },
    {
      id: 'seo-and-metadata/unique-title-and-description',
      strength: 'must',
      statement:
        'Give every indexable page its own title and meta description, with the distinguishing words at the start of the title and the brand at the end.',
      evidence: {
        rationale:
          'Google composes the displayed title link from the title element, headings, og:title and anchor text, and rewrites titles it judges boilerplate or half-empty. Titles are truncated to device width rather than a fixed character count, so trailing words are the ones lost.',
        source: 'Google Search Central, "Influencing your title links"',
        url: 'https://developers.google.com/search/docs/appearance/title-link',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<title>Acme Instruments | Precision Measurement Hardware for Laboratories | Thermocouple K-200</title>',
        good: '<title>Thermocouple K-200 — Type-K probe to 1100°C | Acme</title>',
      },
      verifiedBy: 'metadata-audit',
    },
    {
      id: 'seo-and-metadata/self-referencing-canonical',
      strength: 'must',
      statement:
        'Emit exactly one self-referencing rel="canonical" per indexable page, using an absolute URL.',
      evidence: {
        rationale:
          'Duplicate URLs arise mechanically from tracking parameters, trailing slashes and faceted filters. Without a stated canonical the search engine selects one itself, and it may select the parameterised variant, splitting link signals across URLs. Relative canonicals resolve against the current document and break the moment the page is served from a second path.',
        source: 'Google Search Central, "How to specify a canonical URL"',
        url: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
        confidence: 'established',
      },
      verifiedBy: 'indexability-audit',
    },
    {
      id: 'seo-and-metadata/no-canonical-to-noindex',
      strength: 'must-not',
      statement:
        'Do not canonicalise a page to a URL that is noindex, redirects, or is a different language version of the same content.',
      evidence: {
        rationale:
          'A canonical asserts "index that instead of this". Pointing at a noindex target asks the engine to index nothing, which usually results in both URLs being dropped. Language variants are alternates, not duplicates, and collapsing them removes every localised page but one from its own market.',
        confidence: 'established',
      },
      verifiedBy: 'indexability-audit',
    },
    {
      id: 'seo-and-metadata/heading-outline',
      strength: 'must',
      statement:
        'Use one h1 per page and a heading outline that never skips a level, chosen by rank rather than by desired font size.',
      evidence: {
        rationale:
          'Screen reader users navigate by jumping between headings, so a level chosen for its type size makes the document structure unnavigable. The same outline is what passage-extraction pipelines use to split a page into retrievable chunks, and Google lists heading elements among the sources for a title link, so one broken outline degrades accessibility and discovery simultaneously.',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<h1>Pricing</h1>\n<h4>Per seat</h4>\n<h2>A quiet subtitle</h2>',
        good: '<h1>Pricing</h1>\n<h2>Per seat</h2>\n<p class="subtitle">A quiet subtitle</p>',
      },
    },
    {
      id: 'seo-and-metadata/absolute-og-image',
      strength: 'must',
      statement:
        'Specify og:image with an absolute URL, and supply og:image:width, og:image:height and og:image:alt alongside it.',
      evidence: {
        rationale:
          'Unfurlers fetch the HTML from a different origin and cannot resolve a relative path, so a relative og:image yields a blank card. Without declared dimensions the consumer must download the image before it can lay out the card, and many time out or skip it rather than wait.',
        source: 'Meta for Developers, sharing image guidance',
        url: 'https://developers.facebook.com/docs/sharing/webmasters/images/',
        confidence: 'established',
      },
      verifiedBy: 'metadata-audit',
    },
    {
      id: 'seo-and-metadata/og-image-dimensions',
      strength: 'should',
      statement:
        'Author Open Graph images at 1200x630 (1.91:1), never below the 200x200 minimum, and keep the file under 8 MB.',
      evidence: {
        rationale:
          'Meta documents 1200x630 as the size that renders sharply on high-resolution displays and 1.91:1 as the ratio that avoids cropping in feed. Images below 600x315 are rendered as a small thumbnail rather than a large card, which is a visible downgrade in every consumer that follows the same convention.',
        source: 'Meta for Developers, sharing image guidance',
        url: 'https://developers.facebook.com/docs/sharing/webmasters/images/',
        confidence: 'established',
      },
    },
    {
      id: 'seo-and-metadata/structured-data-matches-page',
      strength: 'must-not',
      statement:
        'Do not mark up prices, ratings, dates, authors or breadcrumbs that are not visible in the rendered page content.',
      evidence: {
        rationale:
          'Google requires structured data to represent content visible to users, and enforces it with manual actions that remove rich result eligibility site-wide. Beyond the policy, a mismatch between markup and page produces a result that misleads the user, who then bounces — which is the outcome the markup was meant to prevent.',
        source: 'Google Search Central, structured data general guidelines',
        url: 'https://developers.google.com/search/docs/appearance/structured-data/sd-policies',
        confidence: 'established',
      },
      verifiedBy: 'structured-data-audit',
    },
    {
      id: 'seo-and-metadata/json-ld-serialised',
      strength: 'must',
      statement:
        'Generate JSON-LD with a real serialiser such as JSON.stringify rather than by string concatenation or template interpolation.',
      evidence: {
        rationale:
          'Concatenated JSON breaks on any unescaped quote, and a product name or article title containing the sequence closing a script tag terminates the block early, turning content into markup — an injection vector as well as a silently invalid payload. A single trailing comma voids the entire block, and consumers report nothing.',
        confidence: 'established',
      },
      verifiedBy: 'structured-data-audit',
    },
    {
      id: 'seo-and-metadata/validate-structured-data',
      strength: 'should',
      statement:
        'Validate structured data with both validator.schema.org for vocabulary and the Rich Results Test for eligibility before shipping it.',
      evidence: {
        rationale:
          'The two tools answer different questions: schema.org validation confirms the types and properties exist, while the Rich Results Test confirms Google will act on them, which is a narrower set. Markup that passes the first and fails the second is syntactically perfect and operationally useless.',
        confidence: 'strong',
      },
      verifiedBy: 'structured-data-audit',
    },
    {
      id: 'seo-and-metadata/no-faq-rich-results',
      strength: 'should-not',
      statement:
        'Do not add FAQPage markup expecting a rich result, and do not treat its removal as a reason to delete an existing block.',
      evidence: {
        rationale:
          'Google stopped showing FAQ rich results on 7 May 2026 and is removing the search appearance filter and Rich Results Test support in June 2026 and Search Console API support in August 2026. Unused structured data does not harm visibility, so removal is unnecessary work, but adding it now returns nothing.',
        source: 'Google Search Central, FAQPage structured data (deprecation notice)',
        url: 'https://developers.google.com/search/docs/appearance/structured-data/faqpage',
        confidence: 'established',
      },
    },
    {
      id: 'seo-and-metadata/noindex-needs-crawlability',
      strength: 'must-not',
      statement:
        'Do not disallow a URL in robots.txt when the goal is to remove it from the index; serve a crawlable page with noindex instead.',
      evidence: {
        rationale:
          'Google states that if a page is disallowed from crawling, indexing and serving rules on that page are never found and are therefore ignored. The URL can remain indexed on the strength of external links, without a snippet, and there is no mechanism left to remove it.',
        source: 'Google Search Central, robots meta tag specifications',
        url: 'https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag',
        confidence: 'established',
      },
      verifiedBy: 'indexability-audit',
    },
    {
      id: 'seo-and-metadata/sitemap-limits-and-lastmod',
      strength: 'should',
      statement:
        'Keep each sitemap file within 50,000 URLs and 50 MB uncompressed, emit lastmod only when it reflects a real content change, and omit priority and changefreq.',
      evidence: {
        rationale:
          'Google documents the 50,000-URL and 50 MB limits and states that it ignores priority and changefreq outright. It uses lastmod only when the value is consistently and verifiably accurate, so stamping every URL with the build time trains the crawler to disregard the field for the whole site.',
        source: 'Google Search Central, "Build and submit a sitemap"',
        url: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap',
        confidence: 'established',
      },
    },
    {
      id: 'seo-and-metadata/hreflang-bidirectional',
      strength: 'must',
      statement:
        'Make hreflang annotations bidirectional and self-referencing, with fully-qualified URLs and valid ISO 639-1 language codes.',
      evidence: {
        rationale:
          'Google requires that if page X links to page Y as an alternate, page Y links back to X and to itself; unreciprocated annotations are ignored, silently, for the whole cluster. A region code alone is invalid, and the common guess "uk" is the ISO 639-1 code for Ukrainian, not a region.',
        source: 'Google Search Central, "Localized versions of your pages"',
        url: 'https://developers.google.com/search/docs/specialty/international/localized-versions',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<link rel="alternate" hreflang="uk" href="/gb/pricing" />',
        good: '<link rel="alternate" hreflang="en-GB" href="https://example.com/gb/pricing" />\n<link rel="alternate" hreflang="x-default" href="https://example.com/pricing" />',
      },
      verifiedBy: 'i18n-and-url-audit',
    },
    {
      id: 'seo-and-metadata/stable-urls-single-redirect',
      strength: 'must',
      statement:
        'Treat URLs as a permanent interface: keep them lowercase, hyphenated and free of session state, and 301 any change directly to the final destination.',
      evidence: {
        rationale:
          'A changed URL without a redirect discards every external link pointing at it, and those links are not recoverable. Chained redirects add a full round trip each to every visit and consume crawl budget, so a redirect that points at another redirect costs latency permanently rather than once.',
        confidence: 'strong',
      },
      verifiedBy: 'i18n-and-url-audit',
    },
    {
      id: 'seo-and-metadata/core-web-vitals-targets',
      strength: 'should',
      statement:
        'Target LCP under 2.5 s, INP under 200 ms and CLS under 0.1 at the 75th percentile of real users, without treating them as a ranking strategy.',
      evidence: {
        rationale:
          'These are the documented "good" thresholds and the documented assessment percentile. Google states there is no single page experience ranking signal and that good Core Web Vitals do not guarantee ranking, so the honest justification is user experience and conversion, with ranking as a marginal tiebreaker.',
        source: 'web.dev, "Web Vitals"; Google Search Central, "Understanding page experience"',
        url: 'https://developers.google.com/search/docs/appearance/page-experience',
        confidence: 'established',
      },
    },
    {
      id: 'seo-and-metadata/explicit-ai-crawler-policy',
      strength: 'should',
      statement:
        'State an explicit robots.txt policy for AI crawlers, distinguishing training agents from search and user-initiated agents rather than blocking or allowing them as one class.',
      evidence: {
        rationale:
          'The vendors separate the roles: OpenAI documents GPTBot for training, OAI-SearchBot for ChatGPT search inclusion and ChatGPT-User for user-initiated fetches; Anthropic documents ClaudeBot, Claude-SearchBot and Claude-User; Google separates Google-Extended from Googlebot. Blocking a training agent costs no visibility today, while blocking a search agent removes the site from an answer surface, so a single blanket rule always gets one of the two decisions wrong.',
        source: 'OpenAI bots documentation; Anthropic crawler support article',
        url: 'https://developers.openai.com/api/docs/bots',
        confidence: 'strong',
      },
      exceptions: [
        'User-initiated fetch agents may not consult robots.txt at all, since the request originates from a person rather than a crawl; verify the vendor documentation before relying on a rule for those.',
      ],
      verifiedBy: 'ai-visibility-audit',
    },
    {
      id: 'seo-and-metadata/self-contained-passages',
      strength: 'should',
      statement:
        'Write sections that answer their heading directly in the first paragraph and remain intelligible when extracted without surrounding context.',
      evidence: {
        rationale:
          'Retrieval pipelines split pages into passages and present them detached from the page. A paragraph opening with "As mentioned above" or resolving a pronoun three paragraphs back becomes meaningless once extracted, so it is discarded in favour of a competitor whose paragraph stands alone.',
        confidence: 'opinion',
      },
      verifiedBy: 'ai-visibility-audit',
    },
    {
      id: 'seo-and-metadata/no-speculative-ai-files',
      strength: 'should-not',
      statement:
        'Do not add llms.txt or similar files on the assumption that answer engines consume them, and do not present them as a ranking measure.',
      evidence: {
        rationale:
          'Google has stated llms.txt is not used by Search, and no major engine documents consuming it; Google separately states that no new machine-readable files or markup are needed to appear in AI Overviews or AI Mode. Shipping one is cheap but reporting it as a discovery improvement misrepresents an unverified claim as a result.',
        source: 'Google Search Central, "AI features and your website"',
        url: 'https://developers.google.com/search/docs/appearance/ai-features',
        confidence: 'strong',
      },
      exceptions: [
        'Publishing a curated Markdown index for your own documentation tooling or agents, where the benefit is internal rather than a discovery claim.',
      ],
    },
  ],

  verification: [
    {
      id: 'rendering-audit',
      kind: 'self-review',
      description: 'Confirm content and metadata exist without JavaScript execution.',
      blocking: true,
      questions: [
        'With JavaScript disabled, or in the raw response body from curl, does the page contain its main content, its h1, its title and its meta description?',
        'Is any metadata set by mutating document.title or injecting tags after hydration?',
        'If metadata streams rather than blocking, which consumers are on the HTML-limited list, and which AI crawlers are not?',
        'Does the JSON-LD block appear in the server-rendered HTML rather than being added client-side?',
      ],
    },
    {
      id: 'metadata-audit',
      kind: 'self-review',
      description: 'Confirm titles, descriptions and share previews are correct per page.',
      blocking: true,
      questions: [
        'Is the title unique to this page, with the distinguishing words first and the brand last?',
        'Does the description describe this page specifically, rather than repeating a site-wide line?',
        'Are og:title, og:description, og:image, og:url and og:type present, and is the image URL absolute?',
        'Are og:image:width, og:image:height and og:image:alt set, and is the image at least 1200x630?',
        'Is twitter:card set to summary_large_image where a wide crop is intended?',
      ],
    },
    {
      id: 'structured-data-audit',
      kind: 'self-review',
      description: 'Confirm JSON-LD is valid, honest and eligible.',
      questions: [
        'Does every marked-up value — price, rating, date, author, breadcrumb — appear in the rendered page?',
        'Was the JSON produced by a serialiser, and does the block parse?',
        'Does it pass validator.schema.org, and separately does the live URL pass the Rich Results Test?',
        'Does the breadcrumb trail in the markup match the trail rendered on the page?',
        'Are dates ISO 8601 with a timezone offset, and is each author a separate entry rather than a joined string?',
      ],
    },
    {
      id: 'indexability-audit',
      kind: 'self-review',
      description: 'Confirm the page can be crawled and indexed as intended.',
      blocking: true,
      questions: [
        'Does the page carry exactly one canonical, absolute and self-referencing?',
        'Does any canonical point at a URL that is noindex, redirects, or is a different language?',
        'Is any URL both disallowed in robots.txt and expected to be de-indexed by a noindex tag?',
        'Is the page reachable by a crawlable anchor from somewhere in the site, rather than only from a client-side router push?',
        'Is it listed in a sitemap under the 50,000-URL and 50 MB limits, with lastmod reflecting a real change?',
      ],
    },
    {
      id: 'i18n-and-url-audit',
      kind: 'self-review',
      description: 'Confirm localisation annotations and URL changes are safe.',
      questions: [
        'Does every hreflang cluster reciprocate, including a self-reference, using fully-qualified URLs?',
        'Are all language codes valid ISO 639-1, with regions as ISO 3166-1 alpha-2, and is there an x-default?',
        'Has any URL changed in this work, and if so does a single 301 point straight at the final destination?',
        'Are there any redirect chains of two or more hops?',
      ],
    },
    {
      id: 'ai-visibility-audit',
      kind: 'self-review',
      description: 'Confirm the AI crawler policy is deliberate and the content is quotable.',
      questions: [
        'Does robots.txt name training agents and search agents separately, and can you state why each rule exists?',
        'Would the first paragraph under each heading answer that heading if it were extracted alone?',
        'Are publication and modification dates, and authorship, stated in the visible page rather than only in markup?',
        'Have any claims been made to the user about llms.txt or AI ranking that are not supported by vendor documentation?',
      ],
    },
  ],

  relatedSkills: ['semantic-html', 'accessible-components', 'web-performance', 'design-judgment'],
}
