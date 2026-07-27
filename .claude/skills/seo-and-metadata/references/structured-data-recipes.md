# Structured data recipes

All examples are JSON-LD in `<script type="application/ld+json">`. Google's requirement
that structured data describe content visible on the page is a policy, not a suggestion:
marking up a price, a rating or a date the user cannot see is a manual-action risk.

## Placement and shape

A page may carry several blocks, or one block containing an array, or a single graph:

    { "@context": "https://schema.org", "@graph": [ {...}, {...} ] }

Prefer `@graph` once entities cross-reference each other, because `@id` values resolve
within the document. Use a stable URI as `@id` — the page URL with a fragment works:
`https://example.com/#organization`.

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

`logo` must be at least 112x112 px. `sameAs` is the entity-disambiguation lever: it is
how a machine decides your "Acme" is this Acme and not the four others. `contactPoint`,
`address`, `telephone` and `vatID` are further recommended trust properties.

## BreadcrumbList

Cheap, widely supported, and it turns the URL line in the result into a readable path.
`position` is 1-indexed and contiguous. Omit `item` on the final element.

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

Supported types are `Article`, `NewsArticle` and `BlogPosting`. Google lists no
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
day. Each author gets **its own `author` entry**, never a comma-joined string, with
`name` holding the name alone; job titles go in `jobTitle`, and `url` or `sameAs`
should resolve to a real profile page. Keep `headline` concise, since long titles are
truncated on some surfaces.

## Product

Google distinguishes two experiences. A **product snippet** suits pages where the item
cannot be bought directly; a **merchant listing** suits pages where it can, and requires
`name`, `image` and a nested `offers` carrying `price` (or
`priceSpecification.price`), `priceCurrency` and `availability`. Merchant listings
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

`price` is a number, not a string with a currency symbol; the symbol lives in
`priceCurrency` as an ISO 4217 code. `availability` takes a schema.org enumeration URL,
not the words "in stock". Identifiers — `gtin`, `mpn`, `sku` — are recommended rather
than required, but they are what lets a product be matched across sites, so omitting them
forfeits most of the benefit. `shippingDetails` and `hasMerchantReturnPolicy` drive the
shipping and returns annotations in merchant experiences.

Never mark up an `aggregateRating` that is not rendered on the page, and never
self-serve a review of your own product.

## Validation, in order

1. **JSON parses.** A trailing comma silently voids the whole block. Generate with
   `JSON.stringify`, never by concatenation — which is also how the markup becomes an
   injection vector when a product name contains a closing script tag.
2. **validator.schema.org** — vocabulary: are these real types and properties?
3. **Rich Results Test** (search.google.com/test/rich-results) — Google eligibility, a
   narrower and different question. Test the live URL, because it renders the page.
4. **Search Console** rich result reports — the only source of truth at scale, and the only
   one that surfaces errors on pages you did not think to test.

Google is retiring FAQ support across these tools through 2026: the search appearance and
Rich Results Test support in June, the Search Console API in August.
