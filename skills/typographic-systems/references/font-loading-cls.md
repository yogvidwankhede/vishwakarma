# Font loading without layout shift

Webfont layout shift is a metrics problem, not a timing problem. Text renders first in a
fallback face, then re-renders in the webfont. If the two faces have different vertical
metrics or different average advance widths, every line box changes height or every
paragraph changes line count, and everything below moves. Delaying the swap does not fix
this; matching the metrics does.

## The four steps, in order of impact

### 1. Self-host, and preload the faces used above the fold

A font on a third-party origin costs a DNS lookup, a TCP connection, and a TLS handshake
before the request even starts, and cross-origin caches are partitioned per site, so the
"shared cache" argument no longer holds. Copy the files into your own origin.

Then preload only the faces that render in the first viewport:

```html
<link rel="preload" href="/fonts/inter-var-latin.woff2" as="font" type="font/woff2" crossorigin>
```

`crossorigin` is required even for same-origin fonts, because font fetches are made in
anonymous CORS mode; without it the browser downloads the file twice. Preloading more than
two files is counterproductive — preloads compete with the stylesheet and the hero image at
the highest priority band.

### 2. Choose font-display deliberately

- `swap` — zero block period, infinite swap period. Text is always visible; the swap will
  happen however late it arrives. Correct for body text once metrics are matched.
- `optional` — roughly 100ms block period and no swap period. If the font is not ready, the
  page uses the fallback for that navigation and the font is cached for the next. This is
  the only value that structurally guarantees no swap shift, at the cost of first-visit
  visual inconsistency. Correct for brand display faces and for very shift-sensitive pages.
- `fallback` — a short block, then a roughly 3s swap window. A middle position.
- `block` — up to 3s of invisible text. Almost never right; invisible text is worse than
  fallback text.

### 3. Match the fallback metrics

This is the step that actually removes the shift. Declare a second `@font-face` that maps a
`local()` system font and overrides its metrics to match the webfont:

```css
@font-face {
  font-family: 'Brand Fallback';
  src: local('Arial');
  size-adjust: 107.4%;
  ascent-override: 90.2%;
  descent-override: 22.5%;
  line-gap-override: 0%;
}

body { font-family: 'Brand', 'Brand Fallback', sans-serif; }
```

What each descriptor does:

- `size-adjust` scales all glyph outlines and advances. Set it so the fallback's average
  advance width matches the webfont's; this is what keeps line counts identical.
- `ascent-override` and `descent-override` are percentages of the em, replacing the values
  the fallback's own tables report. They fix line-box height, which is what makes blocks the
  same height even when the text fits identically.
- `line-gap-override` is usually set to `0%`, since most fallback faces report a nonzero
  line gap that the webfont does not.

Derive the numbers from the font tables rather than guessing: ascent, descent, lineGap, and
unitsPerEm come from `hhea` / `OS/2`, and each override is the metric divided by
unitsPerEm. For `size-adjust`, compare the average advance width of the two faces over a
representative character set. Tools exist that emit these blocks automatically; frameworks
that wrap font loading generally generate them for you, and if yours does, do not hand-write
them as well.

All four descriptors are Baseline-available across current browsers.

### 4. Subset

Ship WOFF2 only — WOFF1 and TTF fallbacks are dead weight for any browser in support.
Subset to the scripts you actually serve and split by `unicode-range` so a page of English
text never downloads the Cyrillic block:

```css
@font-face {
  font-family: 'Brand';
  src: url('/fonts/brand-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+2000-206F, U+2212;
  font-display: swap;
}
```

A Latin subset of a weight axis typically lands at 25–45KB. Also drop unused OpenType
features and unused variable axes; a font shipped with `opsz`, `slnt`, `wdth`, and `GRAD`
when you only vary weight can be several times larger than it needs to be.

## Verification

Load the page with the network throttled to slow 3G and watch for reflow at the moment of
swap. Then measure: CLS attributable to fonts should be zero. If a shift remains, the
fallback metrics are wrong, not the loading strategy. A useful check is to disable the
webfont entirely and compare the rendered height of a long paragraph — with correct
overrides the two heights should match within a pixel or two.

## Traps

- **Preloading a font that a media query never applies.** The download happens anyway.
- **`font-display: swap` on an icon font.** The fallback renders as random Latin letters
  before the swap. Use `block` for icon fonts, or better, use SVG.
- **Declaring one `@font-face` per weight from a variable file.** Use one declaration with
  `font-weight: 100 900` so the browser fetches a single file.
- **Loading the font in JavaScript after hydration.** The swap then lands after the largest
  contentful paint, which is the worst possible moment for it.
- **Fallback stacks that jump scripts.** If the fallback for a Latin face is a system UI
  font on one platform and a serif on another, the shift differs per platform and your
  local testing will not see it.
