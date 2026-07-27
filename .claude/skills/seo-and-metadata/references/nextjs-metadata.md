# Metadata in a Next.js App Router application

Verified against the Next.js documentation as of March 2026 (docs version 16.2.x). The
Metadata API was introduced in 13.2.

## Two exports, never both

From a `layout.tsx` or `page.tsx`, export either a static `metadata` object or an
async `generateMetadata` function — exporting both from the same segment is an error.
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
        alternates: { canonical: `/blog/${slug}` },
        openGraph: { images: [post.image, ...previousImages] },
      }
    }

Note that `params` and `searchParams` are **promises** and must be awaited.
`searchParams` is available only in `page` segments, not layouts. `fetch` calls
inside `generateMetadata` are memoised against the same calls in the page, so fetching
the same record twice does not cost two requests; where `fetch` is not the transport,
wrap the loader in React's `cache`.

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

`title` accepts a string or an object with `default`, `template` and `absolute`.
The template applies to **child** segments only, never to the segment declaring it, and
`default` is mandatory alongside `template`. A child needing to escape the template
sets `title: { absolute: 'Login' }`.

## Merging is shallow, and this is the classic bug

Metadata resolves root-downward and merges **shallowly**. A child that sets
`openGraph.title` replaces the *entire* parent `openGraph` object — losing
`siteName`, `locale`, `type` and images. Hoist the shared parts into a module and
spread them:

    // shared-metadata.ts
    export const og = { siteName: 'Acme', locale: 'en_GB', type: 'website' } as const

    // app/blog/[slug]/page.tsx
    openGraph: { ...og, title: post.title, type: 'article' }

## File conventions beat the object

File-based metadata takes priority over the object and the function. Prefer it, because
it cannot drift out of sync with the asset:

- `app/opengraph-image.tsx` (or `.png`/`.jpg`) — emits `og:image` plus width,
  height and type automatically. Export `size`, `contentType` and `alt`, and render
  with `ImageResponse` for a generated card.
- `app/twitter-image.tsx` — the same for `twitter:image`.
- `app/icon.tsx`, `app/apple-icon.tsx`, `app/manifest.ts`.
- `app/sitemap.ts` exporting a `MetadataRoute.Sitemap`.
- `app/robots.ts` exporting a `MetadataRoute.Robots`.

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

`viewport`, `themeColor` and `colorScheme` were deprecated in the metadata object in
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

Since 15.2, when `generateMetadata` cannot be prerendered, Next.js sends the initial UI
first and appends the resolved tags to `<body>` afterwards. The documentation states this
was verified against bots that execute JavaScript and inspect the DOM, such as Googlebot.
For **HTML-limited bots** that do not — `facebookexternalhit` is the documented example —
Next.js detects the user agent and blocks rendering so the tags land in `<head>`. The
list is overridable via `htmlLimitedBots` in `next.config`; setting it to `/.*/`
disables streaming metadata entirely at the cost of TTFB. This matters because AI crawlers
also do not execute JavaScript, and they are not all on the default list.

## Traps

- **JSON-LD has no metadata field.** Render it in the component tree as a `<script
  type="application/ld+json">` with `dangerouslySetInnerHTML` and `JSON.stringify`.
- **Client components cannot export metadata.** Keep `page.tsx` a server component and
  push `'use client'` down into a child.
- **Canonicals are per-page.** A canonical set only in the root layout makes every route
  claim to be the home page — worse than no canonical at all.
- **Open Graph images in the object need absolute URLs** unless `metadataBase` is set.
