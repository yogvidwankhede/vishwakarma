// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Typography is the discipline where "looks fine" and "is correct" diverge most sharply.
 *
 * An interface can have every size, weight, and line-height set explicitly and still be
 * untypeset, because the values were chosen one component at a time. The result is a page
 * with eleven font sizes, one line-height, and zero tracking — every number defensible in
 * isolation, none of them belonging to a system.
 *
 * This skill exists to replace per-component decisions with a small closed set of tokens
 * and a handful of relationships that generate them: size determines leading, size
 * determines tracking, size determines optical size, and measure determines both. Once
 * those relationships are fixed, most typographic decisions stop being decisions.
 */
export const typographicSystems: SkillManifest = {
  vsm: '1.0',
  id: 'typographic-systems',
  name: 'Typographic Systems',
  description:
    'Use when choosing typefaces, building a type scale, setting line-height, tracking, or measure, or loading webfonts without layout shift.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'ui',
  tags: ['typography', 'type-scale', 'fonts', 'readability', 'cls', 'variable-fonts'],

  activation: {
    intents: [
      'choosing or pairing typefaces for an interface',
      'defining a type scale or typography tokens',
      'setting font sizes, line-height, letter-spacing, or measure',
      'loading webfonts, or fixing layout shift caused by a font swap',
      'the user says the text looks cramped, loose, hard to read, or unpolished',
      'formatting numbers, tables, or headings that wrap badly',
    ],
    globs: [
      '**/*.css',
      '**/*.scss',
      '**/tailwind.config.*',
      '**/theme.*',
      '**/tokens.*',
      '**/typography.*',
      '**/fonts.*',
    ],
    keywords: [
      'typography',
      'font',
      'typeface',
      'type scale',
      'line-height',
      'leading',
      'letter-spacing',
      'tracking',
      'measure',
      'webfont',
      'font-display',
      'variable font',
    ],
  },

  content: {
    summary:
      'Build interface typography as a closed system: one family with several weights, a modular scale sized to context, leading and tracking derived from size, a bounded measure, and webfonts that swap without shifting layout.',

    body: `# Typographic Systems

Typography in an interface is not styling text. It is defining a small closed system — a
handful of sizes, a handful of weights, and relationships that derive everything else — and
then refusing to step outside it. Nearly every typographic failure in shipped UI has the
same cause: values chosen locally, component by component, with no scale to belong to.

---

## 1. One family, several weights

Most interfaces should use one typeface family and get their variety from weight. Two
families means two sets of vertical metrics, two x-heights that will not agree at the same
\`font-size\`, two loading paths that can shift independently, and a pairing judgement that
has to hold at every size in the product. A single family at 400 / 500 / 600 / 700 already
gives four levels of emphasis that harmonise by construction.

Add a second family only for a genuine categorical distinction: a monospace for code and
log output, or a display face used at one size and nowhere else. If you do pair, the
contrast must be unmistakable — a geometric sans against a high-contrast serif reads as a
decision; two humanist sans faces read as an accident.

For interface text prefer a large x-height, open apertures, and unambiguous \`Il1\` / \`O0\`
shapes: UI text lives at 12–16px, where stroke modulation is invisible and glyph
disambiguation is everything.

---

## 2. A scale, and only the scale

Generate sizes from a base and a ratio (\`base x ratio^n\`), round to whole pixels, and
freeze the result as tokens. The ratio should differ by context, and this is the step most
often got wrong.

**Product UI: 1.125 to 1.2.** The usable range is narrow — roughly 12px to 32px — and
hierarchy is carried mainly by weight, colour, and space. A small ratio yields enough
distinct steps inside that range without producing a 40px subheading in a settings panel.

**Editorial: 1.25 to 1.5.** The range runs from 16px to 72px and hierarchy is carried by
size itself, so steps must be large enough to read as different ranks at a glance.

Apply an editorial ratio to product UI and dense screens explode; apply a UI ratio to an
article and the headline is indistinguishable from the body. Six or seven steps is enough
for either. If you need an eighth, you probably need a weight instead.

---

## 3. Leading and tracking are functions of size

Both scale inversely with size, for different reasons, and both are constant sources of
error because a single global value looks acceptable at exactly one size.

**Leading.** Line spacing exists so the return sweep finds the next line. The gap needed
grows with measure and shrinks, proportionally, as type gets larger — a 1.5 multiplier at
48px produces a 24px gap that splits the headline into unrelated strips. Use roughly:

| Size | line-height | tracking |
| --- | --- | --- |
| 12px | 1.45 | +0.01em |
| 14px | 1.45 | +0.005em |
| 16px (body) | 1.5–1.6 | 0 |
| 20px | 1.4 | -0.005em |
| 24px | 1.3 | -0.01em |
| 32px | 1.2 | -0.015em |
| 48px | 1.1 | -0.02em |
| 64px+ | 1.0–1.05 | -0.03em |

**Tracking.** Sidebearings are fitted by the type designer for reading sizes. Scaling is
linear but perceived spacing is not, so the same fitting looks loose when enlarged and
cramped when reduced. Zero tracking everywhere is the surest sign of untypeset type.

All-caps and small-caps runs need **+0.06em to +0.1em** on top of the size-derived value.
Capitals were spaced for use inside lowercase text, and a run of them collides otherwise.

---

## 4. Optical sizing and variable fonts

A variable font with an \`opsz\` axis carries different outlines for different sizes:
sturdier hairlines and looser spacing when small, finer hairlines and tighter spacing when
large. \`font-optical-sizing: auto\` is the default and ties \`opsz\` to the computed
\`font-size\` — leave it alone rather than pinning \`opsz\` through
\`font-variation-settings\`, which silently resets every axis it does not mention.

Payload: a Latin-subset variable font with one weight axis typically lands at 25–45KB
WOFF2, against 15–25KB per static weight, so the break-even is around three weights. Below
that, ship statics; above it, ship the variable font with unused axes dropped.

---

## 5. Measure

Constrain any container holding sentences. The readable band is **45–75 characters**: aim
for 60–70 in UI prose and 45–55 in sidebars and columns. Beyond it the return sweep becomes
unreliable and readers re-read lines without noticing.

Set it with \`max-inline-size: 65ch\`, but know what \`ch\` means: the advance width of the
digit zero, which in most sans faces exceeds the average lowercase glyph. A 65ch container
therefore renders roughly 72–78 real characters. Set the value, then count a line.

---

## 6. Vertical rhythm without a baseline grid

Strict baseline grids almost never survive real UI. Every line box carries half-leading
split above and below the text, and inputs, avatars, icons, and mixed-size runs each bring
their own metrics, so pinning everything to a 24px baseline needs per-component
compensating margins that break the moment a component's content changes size.

What works instead: quantise spacing to a 4px grid, compute leading so each text block is a
whole number of pixels tall, and use \`text-box-trim: trim-both\` with
\`text-box-edge: cap alphabetic\` (Chrome 133+, Safari 18.2+) to remove half-leading so the
gap you specify is the gap you see. Where unsupported, subtract the half-leading with a
negative margin rather than eyeballing it.

---

## 7. Numerals

Use \`font-variant-numeric: tabular-nums\` anywhere digits align vertically or change in
place: tables, price columns, dashboards, timers, counters. Proportional figures have
per-glyph widths, so a counter ticking 1 to 8 reflows and a price column fails to align on
the decimal.

Keep proportional figures in prose and headlines. Tabular figures pad narrow digits, and a
headline containing "11" set tabular looks broken.

---

## 8. Wrapping, rag, and orphans

\`text-wrap: balance\` equalises line lengths across a short block. Browsers cap how many
lines they will balance (Chrome stops at around six) because the algorithm is superlinear,
so it is for headings, card titles, and buttons — never body copy. Firefox 121+,
Safari 17.5+, Chrome fully from 130.

\`text-wrap: pretty\` is the paragraph tool: it gives up a little evenness across the block
to avoid a single-word last line and other bad breaks. Chrome since 117, Safari since 26,
not yet Firefox. It degrades to normal wrapping, so apply it freely to prose.

\`hyphens: auto\` requires a \`lang\` attribute on the document or element — without it no
dictionary is selected and nothing hyphenates. Pair it with \`hyphenate-limit-chars: 6 3 3\`
to stop two-letter fragments. Justifying without hyphenation is always wrong: flush edges
with no break opportunities open rivers of whitespace down the column.

---

## 9. Hierarchy: which lever to pull

Space separates, weight emphasises, size ranks, colour labels. Below about 20px a 2px size
difference is imperceptible while 400 to 600 is unmistakable, so dense UI should carry
emphasis in weight and reserve size for genuine rank changes. Colour is the weakest lever:
on a screen where six things are coloured, colour has stopped ranking anything.

---

## 10. Failures to check

Same \`line-height\` on headlines and body. Zero tracking everywhere. Eleven font sizes where
five would do. Prose running the full width of a 1440px viewport. Faux bold, where the
browser synthesises a missing weight by smearing outlines — set \`font-synthesis: none\` so
this fails loudly. Centred paragraphs, which give every line a different starting point.
All-caps with no added tracking. Letter-spacing on lowercase body text. UI text below 12px.

Font loading is a subsystem of its own: see the font-loading reference for \`font-display\`,
preloading, subsetting, and the metric overrides that eliminate swap-induced layout shift.`,

    references: [
      {
        id: 'font-loading-cls',
        title: 'Font loading without layout shift',
        answers:
          'How do I load webfonts so that text is visible early and the swap from fallback to webfont causes no layout shift?',
        content: `# Font loading without layout shift

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

\`\`\`html
<link rel="preload" href="/fonts/inter-var-latin.woff2" as="font" type="font/woff2" crossorigin>
\`\`\`

\`crossorigin\` is required even for same-origin fonts, because font fetches are made in
anonymous CORS mode; without it the browser downloads the file twice. Preloading more than
two files is counterproductive — preloads compete with the stylesheet and the hero image at
the highest priority band.

### 2. Choose font-display deliberately

- \`swap\` — zero block period, infinite swap period. Text is always visible; the swap will
  happen however late it arrives. Correct for body text once metrics are matched.
- \`optional\` — roughly 100ms block period and no swap period. If the font is not ready, the
  page uses the fallback for that navigation and the font is cached for the next. This is
  the only value that structurally guarantees no swap shift, at the cost of first-visit
  visual inconsistency. Correct for brand display faces and for very shift-sensitive pages.
- \`fallback\` — a short block, then a roughly 3s swap window. A middle position.
- \`block\` — up to 3s of invisible text. Almost never right; invisible text is worse than
  fallback text.

### 3. Match the fallback metrics

This is the step that actually removes the shift. Declare a second \`@font-face\` that maps a
\`local()\` system font and overrides its metrics to match the webfont:

\`\`\`css
@font-face {
  font-family: 'Brand Fallback';
  src: local('Arial');
  size-adjust: 107.4%;
  ascent-override: 90.2%;
  descent-override: 22.5%;
  line-gap-override: 0%;
}

body { font-family: 'Brand', 'Brand Fallback', sans-serif; }
\`\`\`

What each descriptor does:

- \`size-adjust\` scales all glyph outlines and advances. Set it so the fallback's average
  advance width matches the webfont's; this is what keeps line counts identical.
- \`ascent-override\` and \`descent-override\` are percentages of the em, replacing the values
  the fallback's own tables report. They fix line-box height, which is what makes blocks the
  same height even when the text fits identically.
- \`line-gap-override\` is usually set to \`0%\`, since most fallback faces report a nonzero
  line gap that the webfont does not.

Derive the numbers from the font tables rather than guessing: ascent, descent, lineGap, and
unitsPerEm come from \`hhea\` / \`OS/2\`, and each override is the metric divided by
unitsPerEm. For \`size-adjust\`, compare the average advance width of the two faces over a
representative character set. Tools exist that emit these blocks automatically; frameworks
that wrap font loading generally generate them for you, and if yours does, do not hand-write
them as well.

All four descriptors are Baseline-available across current browsers.

### 4. Subset

Ship WOFF2 only — WOFF1 and TTF fallbacks are dead weight for any browser in support.
Subset to the scripts you actually serve and split by \`unicode-range\` so a page of English
text never downloads the Cyrillic block:

\`\`\`css
@font-face {
  font-family: 'Brand';
  src: url('/fonts/brand-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+2000-206F, U+2212;
  font-display: swap;
}
\`\`\`

A Latin subset of a weight axis typically lands at 25–45KB. Also drop unused OpenType
features and unused variable axes; a font shipped with \`opsz\`, \`slnt\`, \`wdth\`, and \`GRAD\`
when you only vary weight can be several times larger than it needs to be.

## Verification

Load the page with the network throttled to slow 3G and watch for reflow at the moment of
swap. Then measure: CLS attributable to fonts should be zero. If a shift remains, the
fallback metrics are wrong, not the loading strategy. A useful check is to disable the
webfont entirely and compare the rendered height of a long paragraph — with correct
overrides the two heights should match within a pixel or two.

## Traps

- **Preloading a font that a media query never applies.** The download happens anyway.
- **\`font-display: swap\` on an icon font.** The fallback renders as random Latin letters
  before the swap. Use \`block\` for icon fonts, or better, use SVG.
- **Declaring one \`@font-face\` per weight from a variable file.** Use one declaration with
  \`font-weight: 100 900\` so the browser fetches a single file.
- **Loading the font in JavaScript after hydration.** The swap then lands after the largest
  contentful paint, which is the worst possible moment for it.
- **Fallback stacks that jump scripts.** If the fallback for a Latin face is a system UI
  font on one platform and a serif on another, the shift differs per platform and your
  local testing will not see it.`,
      },
      {
        id: 'worked-type-scale',
        title: 'A complete worked type scale for product UI',
        answers:
          'What does a finished, token-level type scale for an application interface actually look like, with every size, weight, leading, and tracking value filled in?',
        content: `# A complete worked type scale for product UI

A concrete scale for an application interface: base 16px, ratio 1.2 (minor third) rounded
to whole pixels, one sans family with weights 400/500/600/700. Every value below is
derived, not chosen ad hoc — leading and tracking follow from size, and the roles map onto
real components.

## The tokens

| Token | Size | Weight | line-height | Tracking | Where it is used |
| --- | --- | --- | --- | --- | --- |
| \`display\` | 40px | 700 | 44px (1.10) | -0.02em | Marketing hero, empty-state headline |
| \`title-1\` | 32px | 600 | 38px (1.19) | -0.015em | Page title |
| \`title-2\` | 24px | 600 | 31px (1.29) | -0.01em | Section heading, modal title |
| \`title-3\` | 20px | 600 | 28px (1.40) | -0.005em | Card title, panel heading |
| \`body-lg\` | 18px | 400 | 28px (1.56) | 0 | Lead paragraph, dialog body |
| \`body\` | 16px | 400 | 24px (1.50) | 0 | Default prose and form values |
| \`body-sm\` | 14px | 400 | 20px (1.43) | +0.005em | Table cells, dense lists, help text |
| \`label\` | 14px | 500 | 20px (1.43) | +0.005em | Form labels, buttons, tabs |
| \`caption\` | 12px | 400 | 16px (1.33) | +0.01em | Timestamps, metadata, footnotes |
| \`overline\` | 12px | 600 | 16px (1.33) | +0.08em, uppercase | One eyebrow label per screen, at most |
| \`code\` | 14px | 400 | 20px (1.43) | 0 | Inline code, identifiers, logs |

Eleven tokens, but only seven distinct sizes — \`label\` differs from \`body-sm\` by weight
alone, and \`overline\` from \`caption\` by weight and casing. That is the point: below 20px,
weight separates roles more cleanly than size does.

Every line-height is a whole number of pixels and a multiple of 4, so text blocks stack on
the same spacing grid as everything else without a baseline grid.

## As CSS

\`\`\`css
:root {
  --font-sans: 'Brand', 'Brand Fallback', system-ui, sans-serif;
  --font-mono: 'Brand Mono', ui-monospace, monospace;

  --text-display: 700 2.5rem/2.75rem var(--font-sans);
  --text-title-1: 600 2rem/2.375rem var(--font-sans);
  --text-title-2: 600 1.5rem/1.9375rem var(--font-sans);
  --text-title-3: 600 1.25rem/1.75rem var(--font-sans);
  --text-body-lg: 400 1.125rem/1.75rem var(--font-sans);
  --text-body: 400 1rem/1.5rem var(--font-sans);
  --text-body-sm: 400 0.875rem/1.25rem var(--font-sans);
  --text-caption: 400 0.75rem/1rem var(--font-sans);

  --tracking-display: -0.02em;
  --tracking-title-1: -0.015em;
  --tracking-title-2: -0.01em;
  --tracking-title-3: -0.005em;
  --tracking-body: 0;
  --tracking-small: 0.005em;
  --tracking-caption: 0.01em;
  --tracking-caps: 0.08em;
}

h1 {
  font: var(--text-title-1);
  letter-spacing: var(--tracking-title-1);
  text-wrap: balance;
}

p {
  font: var(--text-body);
  max-inline-size: 65ch;
  text-wrap: pretty;
}

td, .tabular {
  font: var(--text-body-sm);
  font-variant-numeric: tabular-nums;
}
\`\`\`

Sizes are expressed in \`rem\` so that a user's browser font-size setting scales the whole
interface; pixel values in the table are what those \`rem\` values render to at the 16px
default. Tracking stays in \`em\` so it scales with the type rather than with the root.

## Responsive behaviour

Do not scale the whole system. Only the top two or three steps need to shrink on small
screens, because \`body\` at 16px is already correct everywhere and shrinking it hurts.

\`\`\`css
@media (max-width: 640px) {
  :root {
    --text-display: 700 2rem/2.25rem var(--font-sans);
    --text-title-1: 600 1.75rem/2.125rem var(--font-sans);
  }
}
\`\`\`

If you prefer fluid type, clamp only the display steps and always give \`clamp()\` a \`rem\`
based middle term — \`clamp(2rem, 1.5rem + 2.5vw, 2.5rem)\` — so that a viewport-only middle
term does not defeat browser zoom.

## Editorial variant

For an article layout, keep the same structure and change two inputs: base 18px and ratio
1.333. That yields 18 / 24 / 32 / 42 / 56 / 75, with body leading raised to 1.6 because the
measure is longer, and measure held to 68ch. The token names and the leading/tracking
relationships do not change — only the base and the ratio do, which is the whole argument
for deriving a scale instead of listing one.

## Applying it

- Give every component a token name, never a raw size. A component that needs a size not
  in the table is a signal that either the component is wrong or the table is missing a
  step; resolve it in the table, once.
- Keep the number of tokens visible on any one screen to about six.
- When a designer asks for "slightly bigger", check whether they mean heavier. They
  usually do.`,
      },
    ],
  },

  rules: [
    {
      id: 'typographic-systems/single-family-default',
      strength: 'should',
      statement:
        'Use one typeface family for interface text and express variety through weight, adding a second family only for a categorical distinction such as code.',
      evidence: {
        rationale:
          'Two families bring two sets of vertical metrics and two x-heights, so the same font-size renders at visibly different apparent sizes and line boxes stop agreeing. Weight variation inside one family produces contrast that is guaranteed to harmonise because it was drawn to.',
        confidence: 'strong',
      },
      exceptions: [
        'A brand identity that specifies a display face, used at one size and nowhere else.',
        'Monospace for code, identifiers, or log output, where the categorical distinction is real.',
      ],
    },
    {
      id: 'typographic-systems/scale-ratio-by-context',
      strength: 'should',
      statement:
        'Generate type sizes from a modular scale, using a ratio of 1.125–1.2 for product UI and 1.25–1.5 for editorial layouts.',
      evidence: {
        rationale:
          'Product UI operates in a narrow 12–32px range and carries hierarchy through weight and space, so it needs many small steps; editorial spans 16–72px and carries hierarchy through size itself, so it needs few large ones. Using the wrong ratio either explodes dense screens or collapses headline hierarchy.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '/* 1.414 ratio applied to a settings panel */\n--text-title-3: 2.5rem; /* card titles now larger than the page title should be */',
        good: '/* 1.2 ratio, rounded to whole pixels */\n--text-title-3: 1.25rem;\n--text-title-2: 1.5rem;\n--text-title-1: 2rem;',
      },
      verifiedBy: 'type-scale-audit',
    },
    {
      id: 'typographic-systems/leading-inverse-size',
      strength: 'must',
      statement:
        'Reduce line-height as font-size increases: roughly 1.5 at 16px, 1.3 at 24px, 1.2 at 32px, and 1.0–1.1 at 48px and above.',
      evidence: {
        rationale:
          'Line spacing exists so the eye can find the start of the next line, and the gap needed for that is roughly proportional to measure rather than to glyph size. A multiplier tuned for body text produces an absolute gap at display sizes large enough that the headline stops reading as one object.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: 'h1 { font-size: 3rem; line-height: 1.5; }',
        good: 'h1 { font-size: 3rem; line-height: 1.1; }',
      },
      verifiedBy: 'leading-tracking-audit',
    },
    {
      id: 'typographic-systems/tracking-inverse-size',
      strength: 'should',
      statement:
        'Apply negative letter-spacing at display sizes (about -0.02em at 48px) and slightly positive letter-spacing below 14px, rather than leaving tracking at zero at every size.',
      evidence: {
        rationale:
          'Sidebearings are fitted by the type designer for reading sizes. Scaling those outlines is linear but perception of the counters and gaps between them is not, so the same fitting appears loose when enlarged and cramped when reduced.',
        confidence: 'established',
      },
      exceptions: [
        'Optical-size-aware variable fonts with font-optical-sizing: auto already adjust spacing, so the corrections needed are smaller.',
      ],
      verifiedBy: 'leading-tracking-audit',
    },
    {
      id: 'typographic-systems/caps-need-tracking',
      strength: 'must',
      statement: 'Add 0.06em to 0.1em of letter-spacing to any all-caps or small-caps run.',
      evidence: {
        rationale:
          'Capital glyphs are spaced on the assumption that they are followed by lowercase letters, whose shorter, rounder forms supply part of the visual gap. A run of capitals therefore has no compensating whitespace and the letters visibly collide.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.overline { text-transform: uppercase; font-size: 0.75rem; }',
        good: '.overline { text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.08em; }',
      },
    },
    {
      id: 'typographic-systems/measure-bounded',
      strength: 'must',
      statement:
        'Constrain any container of running prose to roughly 45–75 characters per line, typically max-inline-size: 65ch.',
      evidence: {
        rationale:
          'The return sweep from the end of one line to the start of the next relies on peripheral targeting that degrades with line length. Past about 75 characters readers lose the line and re-read, which measurably reduces both speed and comprehension.',
        confidence: 'established',
      },
      exceptions: [
        'Single-line labels, table cells, and code blocks, which are scanned rather than read continuously.',
      ],
      verifiedBy: 'measure-audit',
    },
    {
      id: 'typographic-systems/tabular-numerals',
      strength: 'must',
      statement:
        'Apply font-variant-numeric: tabular-nums to digits that align in columns or update in place.',
      evidence: {
        rationale:
          'Proportional figures have per-glyph advance widths, so a column of numbers does not align on the decimal and a counter changing from 1 to 8 changes width, forcing the surrounding content to reflow on every tick.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.price-column { text-align: right; }',
        good: '.price-column { text-align: right; font-variant-numeric: tabular-nums; }',
      },
      verifiedBy: 'numerals-audit',
    },
    {
      id: 'typographic-systems/proportional-in-prose',
      strength: 'should-not',
      statement: 'Do not use tabular figures in running prose or headlines.',
      evidence: {
        rationale:
          'Tabular figures pad narrow digits to a common width, which leaves visible gaps around characters like 1 when they sit inside words rather than in a column.',
        confidence: 'strong',
      },
    },
    {
      id: 'typographic-systems/no-faux-bold',
      strength: 'must-not',
      statement:
        'Do not request a weight or style the loaded font does not contain; declare font-synthesis: none so missing weights fail visibly.',
      evidence: {
        rationale:
          'When an unavailable weight is requested the browser synthesises it by outlining or double-drawing the glyphs, which thickens strokes unevenly, destroys the fitted sidebearings, and changes advance widths. The result looks like a rendering fault and, because it silently succeeds, it survives review.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '@font-face { font-family: Brand; src: url(brand-regular.woff2); }\n.title { font-family: Brand; font-weight: 700; }',
        good: '@font-face { font-family: Brand; src: url(brand-semibold.woff2); font-weight: 600; }\n.title { font-family: Brand; font-weight: 600; font-synthesis: none; }',
      },
      verifiedBy: 'font-loading-audit',
    },
    {
      id: 'typographic-systems/font-display-and-metrics',
      strength: 'must',
      statement:
        'Give every @font-face an explicit font-display, and pair every webfont with a metric-overridden fallback using size-adjust, ascent-override, and descent-override.',
      evidence: {
        rationale:
          'Layout shift on font swap is caused by the fallback and the webfont having different average advance widths and different vertical metrics, which changes line counts and line-box heights. Overriding the fallback metrics to match makes the swap dimensionally neutral; changing swap timing only moves the shift.',
        source: 'CSS Fonts Module Level 5, font metrics override descriptors',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/size-adjust',
        confidence: 'established',
      },
      exceptions: [
        'font-display: optional with a preloaded font, which avoids the swap entirely for that navigation.',
      ],
      verifiedBy: 'font-loading-audit',
    },
    {
      id: 'typographic-systems/preload-sparingly',
      strength: 'should-not',
      statement:
        'Do not preload more than about two font files, and always include crossorigin on the preload link.',
      evidence: {
        rationale:
          'Preloads enter the highest priority band and compete directly with the stylesheet and the largest contentful image. Font fetches use anonymous CORS mode, so a preload without crossorigin does not match the later request and the file is downloaded twice.',
        confidence: 'established',
      },
    },
    {
      id: 'typographic-systems/subset-and-woff2',
      strength: 'should',
      statement:
        'Ship WOFF2 only, subset to the scripts actually served, and split by unicode-range.',
      evidence: {
        rationale:
          'unicode-range lets the browser skip downloading a subset entirely when no character on the page falls inside it, so a Latin-only page never pays for Cyrillic or Greek coverage. WOFF2 is supported by every browser still in support, making additional formats pure dead weight.',
        confidence: 'established',
      },
    },
    {
      id: 'typographic-systems/variable-font-breakeven',
      strength: 'may',
      statement:
        'Prefer a variable font when three or more weights are used, and static instances when fewer are.',
      evidence: {
        rationale:
          'A Latin-subset single-axis variable font is typically 25–45KB while a static instance is 15–25KB, so the variable file pays for itself only once roughly three instances would otherwise be downloaded.',
        confidence: 'strong',
      },
    },
    {
      id: 'typographic-systems/balance-headings-only',
      strength: 'should',
      statement:
        'Apply text-wrap: balance only to blocks of at most a few lines such as headings and card titles, and use text-wrap: pretty for paragraphs.',
      evidence: {
        rationale:
          'Balancing re-solves line breaking for the whole block and is superlinear, so browsers cap the number of lines they will balance — Chrome stops at around six — meaning a long paragraph silently gets no balancing at all. pretty is designed for the paragraph case and targets last-line orphans instead.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: 'p { text-wrap: balance; }',
        good: 'h1, h2, h3, .card-title { text-wrap: balance; }\np { text-wrap: pretty; }',
      },
    },
    {
      id: 'typographic-systems/hyphenation-needs-lang',
      strength: 'must',
      statement:
        'Set a lang attribute whenever hyphens: auto is used, and never justify text without hyphenation enabled.',
      evidence: {
        rationale:
          'Automatic hyphenation selects a language dictionary from the element language; with no lang declared no dictionary is chosen and the property has no effect. Justification distributes slack into word spaces, so without break opportunities the slack accumulates into rivers of whitespace down the column.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.column { text-align: justify; }',
        good: '.column { text-align: justify; hyphens: auto; hyphenate-limit-chars: 6 3 3; }',
      },
    },
    {
      id: 'typographic-systems/weight-over-size-at-small-sizes',
      strength: 'should',
      statement: 'Below 20px, express emphasis by changing weight rather than by changing size.',
      evidence: {
        rationale:
          'At small sizes a 1–2px size difference falls below the threshold of reliable perception, while a step from 400 to 600 changes stroke density enough to be unmistakable — and it does so without altering line boxes, so the layout grid stays intact.',
        confidence: 'strong',
      },
      verifiedBy: 'type-scale-audit',
    },
    {
      id: 'typographic-systems/no-centred-paragraphs',
      strength: 'should-not',
      statement: 'Do not centre paragraphs of more than two lines.',
      evidence: {
        rationale:
          'A centred block has a ragged left edge, so every line starts at a different horizontal position and the return sweep has no fixed target to land on. The cost grows with each additional line.',
        confidence: 'established',
      },
      exceptions: ['Single-line display text, pull quotes, and short empty-state messages.'],
    },
    {
      id: 'typographic-systems/no-baseline-grid-dogma',
      strength: 'should',
      statement:
        'Quantise spacing to a 4px grid with whole-pixel line-heights rather than forcing every element onto a strict baseline grid.',
      evidence: {
        rationale:
          'Half-leading is split above and below each line box, and inputs, avatars, icons, and mixed-size runs each carry their own metrics, so baseline alignment requires per-component compensating offsets that break whenever a component changes size. Whole-pixel leading on a 4px grid achieves consistent rhythm without that coupling.',
        confidence: 'opinion',
      },
      exceptions: [
        'Long-form editorial layouts with a single text size, where a baseline grid is both achievable and worthwhile.',
      ],
    },
  ],

  verification: [
    {
      id: 'type-scale-audit',
      kind: 'self-review',
      description: 'Confirm the type scale is a closed system rather than a list of ad hoc values.',
      blocking: true,
      questions: [
        'List every distinct font-size in the output. Does each one correspond to a named token?',
        'Is any pair of sizes closer than the scale ratio, for example 15px next to 16px?',
        'How many distinct sizes appear on a single screen? More than six means levels should be collapsed into weight changes.',
        'Are any two roles distinguished only by size below 20px, where the difference will not be perceptible?',
      ],
    },
    {
      id: 'leading-tracking-audit',
      kind: 'self-review',
      description: 'Confirm leading and tracking vary with size.',
      blocking: true,
      questions: [
        'Does any heading above 32px use a line-height greater than 1.25?',
        'Does every size in the scale have a tracking value, or is letter-spacing left at zero throughout?',
        'Does every all-caps run carry at least 0.06em of extra tracking?',
        'Is every line-height a whole number of pixels at the default root size?',
      ],
    },
    {
      id: 'measure-audit',
      kind: 'self-review',
      description: 'Confirm line lengths stay inside the readable band.',
      questions: [
        'Does every container holding sentences have a max-inline-size?',
        'At the widest supported viewport, count the characters on one full line of body copy. Is it between 45 and 75?',
      ],
    },
    {
      id: 'numerals-audit',
      kind: 'self-review',
      description: 'Confirm numerals are set for their context.',
      questions: [
        'Does every numeric table column, price list, timer, and counter use tabular-nums?',
        'Does any headline or paragraph use tabular-nums where proportional figures belong?',
      ],
    },
    {
      id: 'font-loading-audit',
      kind: 'self-review',
      description: 'Confirm webfonts load without shifting layout or synthesising weights.',
      blocking: true,
      questions: [
        'Does every @font-face declare font-display explicitly?',
        'Is there a metric-overridden fallback face using size-adjust, ascent-override, and descent-override, and does the fallback stack reference it?',
        'Is every font-weight used in CSS backed by a declared face, so nothing is faux-bolded?',
        'Does every preload link include crossorigin, and are there at most two of them?',
        'With the webfont blocked, does a long paragraph render at the same height as with it loaded?',
      ],
    },
    {
      id: 'font-display-declared',
      kind: 'command',
      description:
        'Fail if any stylesheet declares an @font-face without a font-display descriptor nearby.',
      command:
        'rg -n --multiline --multiline-dotall "@font-face\\s*\\{(?:[^}]*?)\\}" -g "*.css" -g "*.scss" -o | rg -v "font-display" | rg -q "@font-face" && exit 1 || exit 0',
    },
  ],

  relatedSkills: [
    'design-judgment',
    'design-tokens',
    'responsive-architecture',
    'accessible-components',
  ],
}
